'use strict';

const sinon = require('sinon');
const assert = require('assert');

const { StsWrapper, LambdaWrapper } = require('../../lib/helpers/aws-wrappers');

const LambdaError = require('../../lib/lambda-error');

const LambdaInstance = require('../../lib/helpers/lambda-instance');

describe('Helpers', () => {

	describe('Lambda Instance', () => {

		const fakeDate = new Date();

		const fakeServiceAccountId = '123456789012';

		const fakeRoleArn = `arn:aws:iam::${fakeServiceAccountId}:role/LambdaRemoteInvoke`;

		const fakeRoleCredentials = {
			Credentials: {
				AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				SessionToken: 'AQoDYXdzEPT//////////wEXAMPLEtc764bNrC9SAPBSM22wDOk4x4HIZ8j',
				Expiration: fakeDate.toISOString()
			}
		};

		const fakeMsPort = 1234;
		const fakeServiceCode = 'fake-service';

		beforeEach(() => {
			process.env.JANIS_SERVICE_NAME = fakeServiceCode;
			process.env.MS_PORT = fakeMsPort;
		});

		afterEach(() => {
			sinon.restore();
			delete process.env.MS_PORT;
			delete LambdaInstance._basicInstance; // eslint-disable-line no-underscore-dangle
			delete LambdaInstance._sts; // eslint-disable-line no-underscore-dangle
			delete LambdaInstance.cachedInstances;
		});

		describe('getInstance()', () => {

			it('Should return a Lambda Instance', () => {

				const instance = LambdaInstance.getInstance();

				assert.ok(instance instanceof LambdaWrapper);
			});

			it('Should return a Lambda instance with local endpoint when useLocalEndpoint is true', async () => {

				const instance = LambdaInstance.getInstance({ useLocalEndpoint: true });

				assert.ok(instance instanceof LambdaWrapper);

				// eslint-disable-next-line no-underscore-dangle
				const { protocol, hostname, port, path } = await instance._lambda.config.endpoint();

				const endpoint = `${protocol}//${hostname}:${port}${path}`;

				assert.deepStrictEqual(endpoint, `http://janis-${fakeServiceCode}:2${fakeMsPort}/`);
			});

			it('Should use the cached basic instance when it was already cached', async () => {

				const instance = LambdaInstance.getInstance();

				instance.isTheSameInstance = true;

				const instance2 = LambdaInstance.getInstance();

				assert.ok(instance2.isTheSameInstance);
			});
		});

		describe('getInstanceWithRole()', async () => {

			it('Should return a Lambda Instance with role credentials', async () => {

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.resolves(fakeRoleCredentials);

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(instanceWithRole instanceof LambdaWrapper);

				sinon.assert.calledOnceWithExactly(StsWrapper.prototype.assumeRole, {
					RoleArn: fakeRoleArn,
					RoleSessionName: LambdaInstance.roleSessionName,
					DurationSeconds: LambdaInstance.roleSessionDuration
				});
			});

			it('Should use the cached instance with role when its credentials are still valid', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Credentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() + 30);

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.resolves({
						...fakeRoleCredentials,
						Credentials: {
							...fakeRoleCredentials.Credentials,
							Expiration: expirationDate.toISOString()
						}
					});

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(instanceWithRole2.isTheSameInstance);
			});

			it('Should not use the cached instance with role when its credentials are expired', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Credentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() - 30);

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.resolves({
						...fakeRoleCredentials,
						Credentials: {
							...fakeRoleCredentials.Credentials,
							Expiration: expirationDate.toISOString()
						}
					});

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(!instanceWithRole2.isTheSameInstance);
			});

			it('Should not use the cached instance when its for a different accountId', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Credentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() + 30);

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.resolves({
						...fakeRoleCredentials,
						Credentials: {
							...fakeRoleCredentials.Credentials,
							Expiration: expirationDate.toISOString()
						}
					});

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole('982174744673');

				assert.ok(!instanceWithRole2.isTheSameInstance);
			});

			it('Should reject when can\'t get the role credentials', async () => {

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.resolves();

				await assert.rejects(LambdaInstance.getInstanceWithRole(fakeServiceAccountId), {
					name: LambdaError.name,
					code: LambdaError.codes.ASSUME_ROLE_ERROR
				});
			});

			it('Should reject when fails at getting the role credentials', async () => {

				sinon.stub(StsWrapper.prototype, 'assumeRole')
					.rejects();

				await assert.rejects(LambdaInstance.getInstanceWithRole(fakeServiceAccountId), {
					name: LambdaError.name,
					code: LambdaError.codes.ASSUME_ROLE_ERROR
				});
			});
		});

		describe('getInstanceForLocalService()', () => {

			it('Should return a Lambda instance with the local service enpoint', async () => {

				const servicePort = 1234;

				const instance = LambdaInstance.getInstanceForLocalService(servicePort);

				assert.ok(instance instanceof LambdaWrapper);

				// eslint-disable-next-line no-underscore-dangle
				const { protocol, hostname, port, path } = await instance._lambda.config.endpoint();

				const endpoint = `${protocol}//${hostname}:${port}${path}`;

				// eslint-disable-next-line no-underscore-dangle
				assert.deepStrictEqual(endpoint, `http://janis-${fakeServiceCode}:2${servicePort}/`);
			});
		});
	});
});

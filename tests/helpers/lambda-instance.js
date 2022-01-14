'use strict';

const sinon = require('sinon');
const assert = require('assert');

const { STS, Lambda } = require('../../lib/helpers/aws-wrappers');

const LambdaError = require('../../lib/lambda-error');

const LambdaInstance = require('../../lib/helpers/lambda-instance');

describe('Helpers', () => {

	describe('Lambda Instance', () => {

		const fakeDate = new Date();

		const fakeServiceAccountId = '123456789012';

		const fakeRoleArn = `arn:aws:iam::${fakeServiceAccountId}:role/JanisRemoteInvoke`;

		const fakeRoleCredentials = {
			Credentials: {
				AccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
				SecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
				SessionToken: 'AQoDYXdzEPT//////////wEXAMPLEtc764bNrC9SAPBSM22wDOk4x4HIZ8j'
			},
			Expiration: fakeDate.toISOString()
		};

		afterEach(() => {
			sinon.restore();
			delete LambdaInstance._basicInstance; // eslint-disable-line no-underscore-dangle
			delete LambdaInstance._sts; // eslint-disable-line no-underscore-dangle
			delete LambdaInstance.cachedInstances;
		});

		describe('getInstance()', () => {

			it('Should return a Lambda Instance', () => {

				const instance = LambdaInstance.getInstance();

				assert.ok(instance instanceof Lambda);
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

				sinon.stub(STS.prototype, 'assumeRole')
					.resolves(fakeRoleCredentials);

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(instanceWithRole instanceof Lambda);

				sinon.assert.calledOnceWithExactly(STS.prototype.assumeRole, {
					RoleArn: fakeRoleArn,
					RoleSessionName: LambdaInstance.roleSessionName,
					DurationSeconds: LambdaInstance.roleSessionDuration
				});
			});

			it('Should use the cached instance with role when its credentials are still valid', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() + 30);

				sinon.stub(STS.prototype, 'assumeRole')
					.resolves({ ...fakeRoleCredentials, Expiration: expirationDate.toISOString() });

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(instanceWithRole2.isTheSameInstance);
			});

			it('Should not use the cached instance with role when its credentials are expired', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() - 30);

				sinon.stub(STS.prototype, 'assumeRole')
					.resolves({ ...fakeRoleCredentials, Expiration: expirationDate.toISOString() });

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				assert.ok(!instanceWithRole2.isTheSameInstance);
			});

			it('Should not use the cached instance when its for a different accountId', async () => {

				const expirationDate = new Date(fakeRoleCredentials.Expiration);
				expirationDate.setMinutes(expirationDate.getMinutes() + 30);

				sinon.stub(STS.prototype, 'assumeRole')
					.resolves({ ...fakeRoleCredentials, Expiration: expirationDate.toISOString() });

				const instanceWithRole = await LambdaInstance.getInstanceWithRole(fakeServiceAccountId);

				instanceWithRole.isTheSameInstance = true;

				const instanceWithRole2 = await LambdaInstance.getInstanceWithRole('982174744673');

				assert.ok(!instanceWithRole2.isTheSameInstance);
			});

			it('Should reject when can\'t get the role credentials', async () => {

				sinon.stub(STS.prototype, 'assumeRole')
					.resolves();

				await assert.rejects(LambdaInstance.getInstanceWithRole(fakeServiceAccountId), {
					name: LambdaError.name,
					code: LambdaError.codes.ASSUME_ROLE_ERROR
				});
			});

			it('Should reject when fails at getting the role credentials', async () => {

				sinon.stub(STS.prototype, 'assumeRole')
					.rejects();

				await assert.rejects(LambdaInstance.getInstanceWithRole(fakeServiceAccountId), {
					name: LambdaError.name,
					code: LambdaError.codes.ASSUME_ROLE_ERROR
				});
			});
		});
	});
});

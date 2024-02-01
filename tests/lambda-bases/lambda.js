'use strict';

const s3 = require('@janiscommerce/s3');
const assert = require('assert');
const sinon = require('sinon');
const { Lambda } = require('../../lib');

describe('Lambda bases', () => {

	const originalEnv = { ...process.env };

	afterEach(() => {
		sinon.restore();
		process.env = { ...originalEnv };
	});

	it('Should have working getter and setter for session', () => {

		const fakeSession = { clientCode: 'some-client' };

		const lambda = new Lambda();

		lambda.session = fakeSession;

		assert.deepStrictEqual(lambda.session, fakeSession);
	});

	it('Should have working getter and setter for data', () => {

		const invocationData = { foo: 'bar' };

		const lambda = new Lambda();

		lambda.data = invocationData;

		assert.deepStrictEqual(lambda.data, invocationData);
	});

	it('Should have working getter and setter for taskToken', () => {

		const invocationData = 'some-token';

		const lambda = new Lambda();

		lambda.taskToken = invocationData;

		assert.deepStrictEqual(lambda.taskToken, invocationData);
	});

	it('Should have working getter and setter for state', () => {

		const invocationData = {
			EnteredTime: '2019-03-26T20:14:13.192Z',
			Name: 'Test',
			RetryCount: 3
		};

		const lambda = new Lambda();

		lambda.state = invocationData;

		assert.deepStrictEqual(lambda.state, invocationData);
	});

	it('Should have validation getter mustHaveClient set as false by default', () => {
		const lambda = new Lambda();
		assert.deepStrictEqual(lambda.mustHaveClient, false);
	});

	it('Should have validation getter mustHavePayload set as false by default', () => {
		const lambda = new Lambda();
		assert.deepStrictEqual(lambda.mustHavePayload, false);
	});

	it('Should have validation getter mustHaveUser set as false by default', () => {
		const lambda = new Lambda();
		assert.deepStrictEqual(lambda.mustHaveUser, false);
	});

	it('Should have validation getter struct set as null by default', () => {
		const lambda = new Lambda();
		assert.deepStrictEqual(lambda.struct, null);
	});

	it('Should have validate method resolving by default', () => {
		const lambda = new Lambda();
		assert.doesNotReject(() => lambda.validate());
	});

	it('Should have process method resolving by default', () => {
		const lambda = new Lambda();
		assert.doesNotReject(() => lambda.process());
	});

	it('Should not upload a file if the bucket variable does not exist', async () => {

		sinon.stub(s3, 'putObject');

		Lambda.bodyToS3Path('folder-test', {});

		sinon.assert.notCalled(s3.putObject);
	});

	context('When S3_BUCKET var is set', () => {

		const s3Bucket = 'bucket-test';

		beforeEach(() => {
			process.env.S3_BUCKET = s3Bucket;
		});

		it('Should upload a file if the bucket variable exist', async () => {

			sinon.stub(s3, 'putObject').resolves();

			const res = await Lambda.bodyToS3Path('folder-test', { id: 'id-test', name: 'name-test' });

			assert.ok(res.contentS3Path);
			assert.ok(!res.id);
			assert.ok(!res.name);

			sinon.assert.calledOnceWithExactly(s3.putObject, {
				Body: JSON.stringify({ id: 'id-test', name: 'name-test' }),
				Bucket: s3Bucket,
				Key: sinon.match.string
			});
		});

		it('Should upload a file and use the fixed properties', async () => {

			sinon.stub(s3, 'putObject').resolves();

			const res = await Lambda.bodyToS3Path('folder-test', { id: 'id-test', name: 'name-test' }, ['id']);

			assert.ok(res.contentS3Path);
			assert.ok(res.id);
			assert.ok(!res.name);

			sinon.assert.calledOnceWithExactly(s3.putObject, {
				Body: JSON.stringify({ id: 'id-test', name: 'name-test' }),
				Bucket: s3Bucket,
				Key: sinon.match.string
			});
		});

		it('Should upload a file if the bucket variable exist', async () => {

			sinon.stub(s3, 'getObject').resolves({ Body: Buffer.from(JSON.stringify({})) });

			await Lambda.getBodyFromS3('folder-test/test.json');

			sinon.assert.calledOnceWithExactly(s3.getObject, {
				Bucket: process.env.S3_BUCKET,
				Key: 'folder-test/test.json'
			});
		});
	});
});

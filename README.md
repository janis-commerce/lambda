# LAMBDA

![Build Status](https://github.com/janis-commerce/lambda/workflows/Build%20Status/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/janis-commerce/lambda/badge.svg?branch=master)](https://coveralls.io/github/janis-commerce/lambda?branch=master)
[![npm version](https://badge.fury.io/js/%40janiscommerce%2Flambda.svg)](https://www.npmjs.com/package/@janiscommerce/lambda)

A package to handle **JANIS** Services invokes between **AWS** lambdas functions for [Serverless Framework](https://www.serverless.com/) using :package: [sls-helper](https://www.npmjs.com/package/sls-helper) and :package: [sls-helper-plugin-janis](https://www.npmjs.com/package/sls-helper-plugin-janis).

This not replace :package: [Microservice-call](https://www.npmjs.com/package/@janiscommerce/microservice-call) for comunication between services, or :package: [Event-Emitter](https://www.npmjs.com/package/@janiscommerce/event-emitter) for comunication using Events.

The main idea is use it to invoke lambda function in the same service, and divide large process into small lambdas functions which are gonna be executed chained.

---

## :inbox_tray: Installation
```sh
npm install @janiscommerce/lambda
```
---

## :hammer_and_wrench: Configuration

You will need made some configuration to be ready to use.

### IAM Statement Permissions

The lambda functions must have permissions to be invoked: `lambda:InvokeFunction`

If you use :package: [sls-helper](https://www.npmjs.com/package/sls-helper) this package provide a simple way to add them, using `invokePermissions`

```js
'use strict';

const { helper } = require('sls-helper');

const { invokePermissions } = require('@janiscommerce/lambda');

module.exports = helper({
	hooks: [

		// Other Service Configs

		...invokePermissions
	]
});

```

### Environment Variables

The package needs some environment variables to work correctly, please check it.

* **AWS** : these are common provided by **Serverless** and **AWS** services
    * `AWS_REGION`
    * `AWS_FUNCTION_NAME` (for re-call functionality)

* **JANIS** : some these are common provided by :package: [sls-helper-plugin-janis](https://www.npmjs.com/package/sls-helper-plugin-janis)
    * `JANIS_SERVICE_NAME`
    * `JANIS_ENV`
* **Other**
    * `MS_PORT`: to use in a `local` dev environment it is necesary to set the port where your service is locally mount, otherwise the default value is `80`. You can set these in `docker-compose` file

    ```yaml
    services:
        some:
            # Other configs
            environment:
            # Other envs
            - MS_PORT=8888
            ports:
            - "8888:8888"
    ```

---

## :page_with_curl: Usage

There two key functions:

* :raised_hand: **Handler**, for making a Lambda Function Class easy
* :loudspeaker: **Invoker**, for invoking a Lambda Function

But first, declare the lambda function using :package: [sls-helper](https://www.npmjs.com/package/sls-helper) 's Hooks.

```json
[
	[
		"function",
		{
			"functionName": "FeedKitties",
			"handler": "somewhere/Kitties/FeedKitties.handler",
			"description": ""
			// other configs
		}
	]
]
```

### :raised_hand:  Handler

It can be used requiring `Handler` class from the package, and passing a Lambda Class and the arguments.

```js
// in 'somewhere/Kitties/FeedKitties.js'
'use strict';

const { Handler } = require('@janiscommerce/lambda');
const FeedKitties = require('./FeedKittiesFunction');

module.exports.handler = (...args) => Handler.handle(FeedKitties, ...args);

```

#### Lambda-Function Class

The Lambda Function Class only needs to have a `process` method to execute. But can have other features that may help you:

* Session
    * `session` (*getter*): To use client with :package: [Api-Session](https://www.npmjs.com/package/@janiscommerce/api-session)

* Payload Body
    * `data` (*getter*): the incoming payload data ready to use

* Validation stages
    * `mustHaveClient` (*getter*) : to check if the function received a client code in the session. **MUST** return `Boolean`. Default is false.
    * `mustHavePayload` (*getter*) : to check if the function received a body in the payload. **MUST** return `Boolean`. Default is false.
    * `mustHaveUser` (*getter*) : to check if the function received a user ID in the session. **MUST** return `Boolean`. Default is false.
    * `struct` (*getter*) : to validate types in the payload, **MUST** use :package: [SuperStruct](https://www.npmjs.com/package/@janiscommerce/superstruct).
    * `validate` (*async*) : to execute other validations you may need after validating struct

* Process stages
    * `process` (*async*): **REQUIRED**. Whatever you need to be executed. The return value will be the response of your function, be careful.


Example
```js
// in 'somewhere/Kitties/FeedKitties.js'
'use strict';

const { Handler } = require('@janiscommerce/lambda');
const { struct } = require('@janiscommerce/superstruct');

const KittyModel = require('../models/Kitty');
const feedFormatter = require('./formatter');

class FeedKitties {

    get mustHaveClient() {
        return true;
    }

    get mustHavePayload() {
        return true;
    }

    get struct() {
        return struct.partial({
            names: '[string]',
            food: 'string',
            quantity: 'number'
        });
    }

    async validate() {

        if(this.data.quantity < 0)
            throw new Error('Invalid Quantity');
    }

    async process() {

        const kittyModel = this.session.getSessionInstance(KittyModel);

        const kitties = await kittyModel.getBy('name', this.data.names);

        await kittyModel.multiSave(feedFormatter(kitties, this.data));

        return { message: 'Kitties Feeded' };
    }
}

module.exports.handler = (...args) => Handler.handle(FeedKitties, ...args);
```

> :warning: For optimal use in local environments the FunctionName declare in the Hook should be the same in Lambda-Function Class

#### Validation Error handling

The `Handler` will not throw exceptions if some validation stages failed, to avoid unnecesary retries.

In exchange it will log the error (you can watch it in *CloudWatch AWS service*), and the handler will response the `errorType` and `errorMessage`:

```json
{
    "errorType": "LambdaError",
    "errorMessage": "Invalid Client"
}
```

But it can be changed if you need it overwriting `handleValidationError` method

```js
// in 'somewhere/Kitties/FeedKitties.js'
'use strict';

const { Handler } = require('@janiscommerce/lambda');
const FeedKitties = require('./FeedKittiesFunction');

class CustomHandler extends Handler {

    // If you want to throw an Error
    static handleValidationError(error) {
        throw error;
    }
}

module.exports.handler = (...args) => CustomHandler.handle(FeedKitties, ...args);
```

#### Process Errors Handling

The `Handler` will throw exception during process stages (if error occurs in `process` method), be careful.

#### Retries

:warning:

For `Async` executions the automatic retries in AWS services cannot be config with this package, you must do it manually or using other tools.

#### Testing

For testing you may do something like this:

```js
const sinon = require('sinon');
const assert = require('assert');

const FeedKitties = require('../somewhere/Kitties/FeedKitties');

describe('Test', () => {

    it('Should do something', async () => {

        const event = { session: { clientCode: 'hiKitty' }, body: { names: ['Tom'], food: 'fish', quantity: 1 }}
        assert.deepStrictEqual(await FeedKitties.handler(event), {
            // something
        });
    });

});

```

### :loudspeaker: Invoker

The `Invoker` make **async*** invokes to a Lambda Function.

#### CALL

* `call(functionName, payload)` (*async*) : Invoke a function with a payload body. If payload is an array, it will make one invoke for each payload.
    * `functionName` (*string*) **required**, function name in TitleCase or dash-case
    * `payload` (*object* or *array of objects*), the data to send
    * returns *array of objects*, with `StatusCode` and `Payload` fields (for each)

```js
//
'use strict'

const { Invoker } = require('@janiscommerce/lambda');

const responseOnlyFunctioName = await Invoke.call('AwakeKitties');

/*
    Invoke JanisKittyService-readme-AwakeKitties function without payload
    responseOnlyFunctioName = [{ StatusCode: 202, Payload: '' }]
*/

const responseWithPayload = await Invoke.call('CallKitty', { name: 'Tom' });

/*
    Invoke JanisKittyService-readme-CallKitty function with 'Tom'
    responseWithPayload = [{ StatusCode: 202, Payload: '' }]
*/

const responseWithMultiplePayloads = await Invoke.call('CallKitties', [{ name: 'Tom' }, { name: 'Blacky' }]);

/*
    Invoke JanisKittyService-readmeEAwakeKitties function  2 times, one for 'Tom' and other for 'Blacky'
    responseWithMultiplePayloads = [{ StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }]
*/

```

#### CLIENT-CALL

* `clientCall(functionName, clientCode, payload)` (*async*) : Invoke a function with a payload body and client. If multiple clients codes and/or payloads are send make one invoke for payload and client.
    * `functionName` (*string*) **required**, function name in TitleCase or dash-case
    * `clientCode` (*string* or *array of strings*) **required**, client code
    * `payload` (*object* or *array of objects*), the data to send
    * returns *array of objects*, with `StatusCode` and `Payload` fields (for each)

```js
'use strict'

const { Invoker } = require('@janiscommerce/lambda');

const responseOneClient = await Invoke.clientCall('AwakeKitties', 'katHouse');

/*
    Invoke JanisKittyService-readme-AwakeKitties function for 'katHouse' client (1 time)
    responseOneClient = [{ StatusCode: 202, Payload: '' }]
*/

const responseTwoClient = await Invoke.clientCall('AwakeKitties', ['katHouse', 'katIsland']);

/*
    Invoke JanisKittyService-readme-AwakeKitties function 2 times, one for 'katHouse' client, other for 'katIsland'
    responseTwoClient = [{ StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }]
*/

const responseOneClientOnePayload = await Invoke.clientCall('AwakeKitties', 'katHouse', { name 'Tom' });

/*
    Invoke JanisKittyService-readme-AwakeKitties function for 'katHouse' client and 'Tom' payload (1 time)
    responseOneClientOnePayload = [{ StatusCode: 202, Payload: '' }]
*/

const responseOneClientTwoPayload = await Invoke.clientCall('AwakeKitties', 'katHouse', [{ name: 'Tom' }, { name: 'Blacky' }]);

/*
    Invoke JanisKittyService-readme-AwakeKitties function 2 times for 'katHouse' client and 'Tom' payload and other for 'Blacky'
    responseOneClientTwoPayload = [{ StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }]
*/

const responseTwoClientOnePayload = await Invoke.clientCall('AwakeKitties', ['katHouse', 'katIsland'], { name 'Tom' });

/*
    Invoke JanisKittyService-readme-AwakeKitties function 2 times, one for 'katHouse' client and 'Tom' and other one for 'katIsland' client and 'Tom'
    responseTwoClientOnePayload = [{ StatusCode: 202, Payload: '' }]
*/

const responseTwoClientTwoPayload = await Invoke.clientCall('CallKitties', ['katHouse', 'katIsland'], [{ name: 'Tom' }, { name: 'Blacky' }]);

/*
    Invoke JanisKittyService-readmeEAwakeKitties function  4 times, one for 'katHouse' and 'Tom', other for 'katHouse' and 'Blacky', other for 'katIsland' and 'Tom', other for 'katIsland' and 'Blacky'
    responseTwoClientTwoPayload = [{ StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }, { StatusCode: 202, Payload: '' }]
*/

```

#### RECALL

* `recall()` (*async*) : Invokes the same function recursively, using the same payload.

```js
'use strict';

const { Handler, Invoker } = require('@janiscommerce/lambda');

const KittyModel = require('../models/Kitty');

class AwakeKitties {

	async process() {

        const kittyModel = this.session.getSessionInstance(KittyModel);

        const kitties = await kittyModel.getBy('status', 'sleeping', { limit: 10 });

        if(kitties.length) {
            await kittyModel.multiSave(kitties.map(({ id }) => ({ id, status: 'awake' })));
            return Invoker.recall();
        }
        /*
            call JanisKittyService-readme-AwakeKitties with the same arguments until there are not sleeping kitties
        */
	}
}

module.exports.handler = (...args) => Handler.handle(AwakeKitties, ...args);
```

#### Invoker-Errors

The Invokes are **async** so the rejections (throw Errors) while using `Invoker` could happen when the function doesn't have enough capacity to handle all incoming request in the queue (in AWS SNS services). Or in Local environment when the lambda-invoked failed (because serverless-offline management).

In no-local environments, when lambda-invoked failed will be handled by AWS DLQ (dead letter queue), but not return to lambda-invoker.

---

## :warning: Errors

The errors of `Handler` and `Invoker` are informed with a `LambdaError`.
This object has a code that can be useful for debugging or error handling.
The codes are the following:

| Code | Description               |
|------|-------------------------- |
| 1    | No Lambda                 |
| 2    | Invalid Lambda            |
| 3    | No Client Found           |
| 4    | Invalid Client            |
| 5    | No Payload body is found  |
| 6    | No Service Name is found  |
| 7    | No Function Name is found |
| 8    | Invalid Function Name     |
| 9    | Invalid Session           |
| 10   | Invalid User              |
| 11   | No user ID is found       |
| 12   | No session is found       |

Struct Error, AWS Errors are informed with their own Error Class.

---

### :loudspeaker: Step Function

`Step Function` is a serverless orchestration service that lets you combine `Lambda` and other AWS services to build business-critical applications

#### Start Executions

* `startExecution(arn, name, client, data)` (*async*): Starts a Synchronous Express state machine execution.
    * `arn` (*string*) **required**, the ARN of the step function
    * `name` (*string*), The name of the execution. This name must be unique.
    * `clientCode` (*string*), the clientCode that will be use in the lambda function
    * `data` (*object*), the data to use in the step funcion
    * returns *object* The step Function response [See more](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#startExecution-property)

```js
'use strict'

const { v4: uuidv4 } = require('uuid');
const { StepFunction } = require('@janiscommerce/lambda');

const arn = 'arn:aws:lambda:us-east-1:123456789012:function:HelloFunction';
const customName = uuidv4();
const clientCode = 'currentClientCode';
const data = {
    foo: 'bar'
};

const { executionArn, startDate } = await StepFunction.startExecution(arn, customName, clientCode, data);
```

#### Stop Executions

* `stopExecution(executionArn, params)` (*async*): Starts a Synchronous Express state machine execution.
    * `executionArn` (*string*) **required**, the ARN of the execution to stop
    * `params` (*string*), With this parameter you can send more details of the stop. For example a `cause` or a `error`
    * returns *object* The step Function response [See more](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#stopExecution-property)

```js
'use strict'

const { StepFunction } = require('@janiscommerce/lambda');

const executionArn = 'arn:aws:lambda:us-east-1:123456789012:function:HelloFunction';

const params = {
    error: 'INTERNAL_ERROR',
    cause: 'The execution will be stopped due to internal errors'
};

const { stopDate } = await StepFunction.stopExecution(executionArn, params);
```

#### List Executions

* `listExecutions(arn, params)` (*async*): Lists the executions of a state machine that meet the filtering criteria.
    * `arn` (*string*) **required**, the ARN of the step function
    * `params` (*string*), The filtering criteria to list the execution.
    * returns *object* The step Function response [See more](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/StepFunctions.html#listExecutions-property)

```js
'use strict'

const { StepFunction } = require('@janiscommerce/lambda');

const arn = 'arn:aws:lambda:us-east-1:123456789012:function:HelloFunction';

const params = {
    statusFilter: 'RUNNING'
};

const { executionArn, startDate } = await StepFunction.listExecutions(arn, params);
```

#### :raised_hand: Parallel Handler

The `ParallelHandler` is like the `Handler` but pre-process the event to prepare the body and session.
This handler should be used when the Lambda is the next Step of a StateMachine Step `Type: Parallel`.

The `data` will be formatted as an _Object Array_ containing the responses of Steps (Branches).

<details>
	<summary>Full example.</summary>


1. StateMachine Definition

![StateMachine Definition](https://github.com/janis-commerce/lambda/blob/master/assets/state-machine-definition.png?raw=true)

2. Parallel Lambdas `First` and `Second` using regular `Handler`.

```js
'use strict';

const { Handler } = require('@janiscommerce/lambda');

class First {

	process() {
		return {
			session: { clientCode: 'my-client-code },
			body: {
				functionName: 'first',
				moreData: 123
			}
		}
	}
}

module.exports.handler = (...args) => Handler.handle(First, ...args);
```

```js
'use strict';

const { Handler } = require('@janiscommerce/lambda');

class Second {

	process() {
		return {
			session: { clientCode: 'my-client-code },
			body: {
				functionName: 'second',
				moreData: 456
			}
		}
	}
}

module.exports.handler = (...args) => Handler.handle(Second, ...args);
```

3. `FinalStep` Lambda. Using `ParallelHandler`.

```js
'use strict';

const { ParallelHandler } = require('@janiscommerce/lambda');

class FinalStep {

	process() {

		console.log(this.data);

		/** Output:
		 * [
		 * 	{
		 * 		functionName: 'first',
					moreData: 123
		 * 	}, {
		 * 		functionName: 'second',
					moreData: 456
		 * 	}
		 * ]
		*/

		console.log(this.session.clientCode); // Output: my-client-code
	}
}

module.exports.handler = (...args) => ParallelHandler.handle(FinalStep, ...args);
```
</details>

## :scroll: Extra Documentation

* **AWS**
    * :page_facing_up: [Lambda Function](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
    * :page_facing_up: [Lambda Function: Permissions and Actions](https://docs.aws.amazon.com/es_es/lambda/latest/dg/lambda-api-permissions-ref.html)
    * :page_facing_up: [Invocation Types](https://aws.amazon.com/es/blogs/architecture/understanding-the-different-ways-to-invoke-lambda-functions/)
    * :page_facing_up: [Invoke](https://docs.aws.amazon.com/lambda/latest/dg/API_Invoke.html)
    * :page_facing_up: [Retry and Errors](https://docs.aws.amazon.com/lambda/latest/dg/invocation-retries.html)
    * :page_facing_up: [Step Function](https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html)
    * :page_facing_up: [Step Function: Type Parallel](https://docs.aws.amazon.com/step-functions/latest/dg/amazon-states-language-parallel-state.html)
* [**Janis**](https://www.npmjs.com/~janiscommerce)
    * :package: [Microservice-call](https://www.npmjs.com/package/@janiscommerce/microservice-call)
    * :package: [Event-Emitter](https://www.npmjs.com/package/@janiscommerce/event-emitter)
    * :package: [Api-Session](https://www.npmjs.com/package/@janiscommerce/api-session)
    * :package: [SuperStruct](https://www.npmjs.com/package/@janiscommerce/superstruct)
* **Serverless**
    *  :page_facing_up: [Documentation](https://www.serverless.com/framework/docs/)

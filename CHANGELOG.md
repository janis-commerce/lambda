# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [6.2.0] - 2024-02-01
### Added
- Lambdas now have access to `State` [context object](https://docs.aws.amazon.com/step-functions/latest/dg/input-output-contextobject.html) for state machines through the `state` getter

## [6.1.0] - 2023-12-15
### Added
- Now when using **Invoker** and **StepFunction**, the `serviceName` will be added in the `session` read from `JANIS_SERVICE_NAME` env var

### Changed
- _Internal_ local development read service port using [@janiscommerce/router-fetcher](https://www.npmjs.com/package/@janiscommerce/router-fetcher)

## [6.0.5] - 2023-09-21
### Fixed
- Fix building local endpoint of a service

## [6.0.4] - 2023-07-26
### Fixed
- The endpoint was fixed when it is a local invocation. Now it will return the service port with the number 2 as prefix.

## [6.0.3] - 2023-07-13
### Fixed
- Error handling with S3 payloads now work properly together (https://janiscommerce.atlassian.net/browse/JCN-435)

## [6.0.2] - 2023-03-14
### Fixed
- fix returning response in lambda invoke method

## [6.0.1] - 2023-03-10
### Fixed
- Fix parsing the response when the invoke method is called

## [6.0.0] - 2023-03-03
### Changed
- Migrate `AWS SDK` to `V3` version

## [5.0.5] - 2023-01-11
### Fixed
- Step function default return value logic improved

## [5.0.4] - 2023-01-11
### Fixed
- Step function `listExecutions` now works properly, passing the right parameters to the AWS SDK

## [5.0.3] - 2023-01-10
### Fixed
- Replaced outdated version of `lodash.pick`

## [5.0.2] - 2023-01-09
### Fixed
- Post-Parallel lambda steps now parse the state machine data properly, and it is passed from step to step in the request and response payloads.

## [5.0.1] - 2023-01-06
### Fixed
- Added default null `session` and `body` in every lambda return value as fallback

## [5.0.0] - 2023-01-05
### Added
- Step functions now store big payloads in S3 to avoid exceeding payload size limit. Potencially a **BREAKING CHANGE**.

## [4.1.1] - 2022-12-20
### Changed
- Updated `@janiscommerce/events` to allow async callback `janiscommerce.ended`

## [4.1.0] - 2022-11-23
### Changed
- `apiCall()` now requires `namespace` and `method`
- On `apiCall()` FunctionName was created with APIs standard

## [4.0.1] - 2022-11-22
### Fixed
- Assumed role cache based on expiration date now works properly
- Package typings fixed for some async methods

## [4.0.0] - 2022-09-26
### Changed
- Now functions with invalid data (client, payload, struct and `validate()` checks failing) will make the function reject instead of returning an error object

## [3.7.2] - 2022-07-07
### Added
- Now handlers creates ENV var `JANIS_FUNCTION_NAME` to add functionName on logs. See more in [@janiscommerce/log](https://www.npmjs.com/package/@janiscommerce/log)

## [3.7.1] - 2022-02-10
### Fixed
- Types definitions fix for dependant packages

## [3.7.0] - 2022-02-03
### Added
- `apiCall` method to call Services Api by Lambda

## [3.6.1] - 2022-02-03
### Fixed
- "service call" methods fixed functions name using correct service title

## [3.6.0] - 2022-02-02
### Added
- `serviceCall` method to call Lambda functions from external services
- `serviceSafeCall` method, same as serviceCall without throwing an error if the lambda response code is 400 or higher
- `serviceClientCall` method to call Lambda functions from external services with session
- `serviceSafeClientCall` method, same as serviceClientCall without throwing an error if the lambda response code is 400 or higher
- IAM Statement for calling external functions into the `invoke-permissions`

## [3.5.0] - 2022-01-31
### Added
- Now each `Lambda` function will emit the event `janiscommerce.ended` using `@janiscommerce/events` after processing

## [3.4.1] - 2022-01-29
### Changed
- AWS SDK require now requires only Lambda and StepFunctions client

## [3.4.0] - 2021-11-29
### Added
- `taskToken` getter is now available for callback-style functions in state machines

## [3.3.2] - 2021-10-14
### Fixed
- Fix making lambda function name when invoking a function

## [3.3.1] - 2021-05-31
### Fixed
- Typings improved

## [3.3.0] - 2021-05-28
### Added
- `Lambda` and `LambdaWithClientAndPayload` base functions are now exported
- Typings added to provide intellisense and autocomplete

## [3.2.0] - 2021-04-15
### Added
- `ParallelHandler` to handle lambda events for parallel steps on State Machines

## [3.1.0] - 2021-01-26
### Added
- StepFunctions wrapper: startExecution, stopExecution and listExecutions

## [3.0.0] - 2020-08-27
### Added
- GitHub Actions for build, coverage and publish

### Changed
- Updated `@janiscommerce/api-session` to `3.x.x`

## [2.0.0] - 2020-08-12
### Changed
- Now `Invoker.clientCall()` accepts a client code or an ApiSession instance. This is not a breaking change of the API, but it may break all of your tests if they use the `__clientCode` property when invoking your functions. It changed to a `session` property (see @janiscommerce/api-session).

## [1.1.0] - 2020-06-18
### Changed
- API Session upgraded to v2 (`api-session` validates locations)

### Removed
- `package-lock.json` file

## [1.0.0] - 2020-05-18
### Added
- Handler class
- Invoker class
- Invoke IAM Statement Permissions

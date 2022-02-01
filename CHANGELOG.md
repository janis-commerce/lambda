# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- `serviceCall` method to call Lambda functions from external services
- `serviceSafeCall` method, same as serviceCall without throwing an error if the lambda response code is 400 or higher
- `serviceClientCall` method to call Lambda functions from external services with session
- `serviceSafeClientCall` method, same as serviceClientCall without throwing an error if the lambda response code is 400 or higher
- IAM Statement for calling external functions into the `invoke-permissions`

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

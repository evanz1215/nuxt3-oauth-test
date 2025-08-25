# Social Login Unit Test Suite

This directory contains comprehensive unit tests for the social login system, covering all composables, utilities, and edge cases.

## Test Structure

### Core Test Files

#### 1. **test/setup.ts**
- Global test environment setup
- Mock configurations for Nuxt composables
- Browser API mocks (window, document, etc.)

#### 2. **test/utils/testHelpers.ts**
- Reusable test utilities and helpers
- Environment setup and cleanup functions
- Mock creation utilities
- Assertion helpers

#### 3. **test/mocks/socialSDKs.ts**
- Mock implementations for all social platform SDKs
- Sample user data for testing
- Mock error responses
- JWT token creation utilities

### Composable Tests

#### 4. **test/config.test.ts** (Enhanced)
- Configuration management testing
- Platform validation
- Environment variable handling
- Edge cases for missing configurations

#### 5. **test/errors.test.ts** (Enhanced)
- Error handling system testing
- Retry mechanisms
- Circuit breaker functionality
- Error logging and statistics

#### 6. **test/useSocialState.enhanced.test.ts**
- State management testing
- Multi-platform authentication
- User data management
- Platform-specific state handling

#### 7. **test/useSocial.enhanced.test.ts**
- Main composable integration testing
- Platform delegation
- Unified login/logout functionality
- Callback handling

#### 8. **test/useGoogle.enhanced.test.ts**
- Google-specific functionality
- Popup and redirect login modes
- SDK loading and initialization
- Error scenarios and edge cases

### Existing Platform Tests (Enhanced Coverage)

#### 9. **test/useApple.test.ts**
- Apple Sign-In integration
- JWT token handling
- Popup and redirect modes
- Error handling

#### 10. **test/useLine.test.ts**
- Line Login integration
- LIFF environment handling
- Bot prompt configurations
- OAuth flow testing

#### 11. **test/useTelegram.test.ts**
- Telegram Login Widget
- Authentication verification
- Widget creation and management
- Callback handling

#### 12. **test/comprehensive.test.ts**
- Environment validation
- Type safety checks
- Performance testing
- Security considerations
- Browser compatibility simulation

## Test Coverage

### Requirements Coverage

The test suite covers all requirements specified in task 10.1:

✅ **為所有 composables 建立單元測試**
- useSocial (main composable)
- useSocialState (state management)
- useSocialConfig (configuration)
- useGoogle, useApple, useLine, useTelegram (platform-specific)

✅ **建立 SDK mock 和測試工具**
- Complete SDK mocks for all platforms
- Test utilities and helpers
- Mock data generators
- Environment setup tools

✅ **測試錯誤處理和邊界情況**
- Network errors and timeouts
- Invalid configurations
- User cancellation scenarios
- SDK loading failures
- State management edge cases
- Concurrent operations
- Security considerations

### Functional Areas Tested

#### Authentication Flows
- Popup login mode
- Redirect login mode
- Callback handling
- Multi-platform authentication
- Platform switching

#### State Management
- User data persistence
- Login state tracking
- Platform-specific states
- Error state handling
- Authentication status

#### Configuration Management
- Environment variable loading
- Platform configuration validation
- Missing configuration handling
- Runtime configuration updates

#### Error Handling
- Platform-specific errors
- Network failures
- User cancellation
- SDK loading errors
- Retry mechanisms
- Circuit breaker patterns

#### SDK Integration
- Dynamic SDK loading
- Initialization procedures
- API call mocking
- Response handling
- Error mapping

### Edge Cases Covered

#### Browser Compatibility
- Different user agents
- Various screen sizes
- Feature detection
- Polyfill requirements

#### Security Scenarios
- XSS prevention
- CSRF protection
- Token security
- Data sanitization

#### Performance Considerations
- Memory leak prevention
- Large data handling
- Concurrent operations
- Timeout management

#### Data Validation
- Type safety checks
- Input validation
- Response validation
- Error object structure

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Files
```bash
npm test -- test/comprehensive.test.ts
npm test -- test/useSocial.enhanced.test.ts
npm test -- test/config.test.ts
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Utilities

### Mock Helpers
- `setupTestEnvironment()` - Initialize test environment
- `cleanupTestEnvironment()` - Clean up after tests
- `mockComposableDependencies()` - Mock Nuxt composables
- `createMockPopup()` - Create popup window mocks
- `mockFetchSuccess()` / `mockFetchError()` - Mock HTTP responses

### Assertion Helpers
- `expectSuccessfulLogin()` - Validate successful login results
- `expectFailedLogin()` - Validate failed login results
- `withTimeout()` - Add timeout to async operations

### Data Generators
- `mockUsers` - Sample user data for all platforms
- `mockErrors` - Platform-specific error responses
- `createMockJWT()` - Generate test JWT tokens

## Best Practices Implemented

### Test Organization
- Descriptive test names
- Logical grouping with describe blocks
- Proper setup and teardown
- Isolated test cases

### Mock Management
- Comprehensive SDK mocking
- Realistic data scenarios
- Error condition simulation
- State isolation between tests

### Assertion Quality
- Specific expectations
- Error message validation
- State verification
- Side effect checking

### Coverage Goals
- All public methods tested
- Error paths covered
- Edge cases included
- Integration scenarios validated

## Maintenance Notes

### Adding New Tests
1. Follow existing naming conventions
2. Use provided test utilities
3. Include both success and error scenarios
4. Add appropriate mocks and setup

### Updating Mocks
1. Keep mocks synchronized with real APIs
2. Update sample data as needed
3. Maintain error response accuracy
4. Document mock behavior changes

### Performance Considerations
1. Use `beforeEach`/`afterEach` for cleanup
2. Avoid test interdependencies
3. Mock heavy operations
4. Keep test data minimal but realistic

This comprehensive test suite ensures the social login system is robust, reliable, and handles all expected scenarios and edge cases properly.
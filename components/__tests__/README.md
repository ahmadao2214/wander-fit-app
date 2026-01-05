# Component Tests

This directory contains unit tests for the authentication UI components.

## Setup

To run these tests, you'll need to install the required testing dependencies:

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
```

Or with yarn:

```bash
yarn add --dev @testing-library/react-native @testing-library/jest-native jest-expo
```

## Running Tests

Run all component tests:

```bash
npm test
```

Run specific test file:

```bash
npx jest components/__tests__/RadioButton.test.tsx
```

Run tests in watch mode:

```bash
npm test -- --watch
```

## Test Coverage

Generate coverage report:

```bash
npx jest --coverage components/__tests__/
```

## Test Files

### RadioButton.test.tsx
Tests for the icon-based radio button cards component:
- Renders with label and description
- Handles click/press events
- Displays checked/unchecked states correctly
- Renders icons properly

### GoogleIcon.test.tsx
Tests for the Google logo SVG component:
- Renders without crashing
- Supports custom sizes
- Contains correct Google brand colors (#4285F4, #34A853, #FBBC05, #EA4335)
- Maintains aspect ratio

### VerificationCodeInput.test.tsx
Tests for the 6-digit verification code input component:
- Renders correct number of input boxes
- Handles single digit input
- Handles paste of full code
- Filters non-numeric characters
- Handles deletion and backspace
- Auto-fills from clipboard

## Test Structure

All tests follow the Arrange-Act-Assert pattern:

```typescript
it('should do something', () => {
  // Arrange: Set up test data and render component
  const { getByText } = render(<Component {...props} />)

  // Act: Perform actions (clicks, input, etc.)
  fireEvent.press(getByText('Button'))

  // Assert: Verify expected behavior
  expect(mockFunction).toHaveBeenCalled()
})
```

## Mocking

Components that depend on Tamagui are wrapped in a `TamaguiProvider` for testing:

```typescript
const AllTheProviders = ({ children }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

render(<Component />, { wrapper: AllTheProviders })
```

## CI/CD

These tests can be integrated into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run component tests
  run: npm test -- --coverage --watchAll=false
```

## Troubleshooting

**Issue**: `Cannot find module 'tamagui'`
**Solution**: Ensure Tamagui is properly installed and configured

**Issue**: `jest: command not found`
**Solution**: Install jest-expo: `npm install --save-dev jest-expo`

**Issue**: Tests timeout
**Solution**: Increase timeout in jest config or add `--testTimeout=10000`

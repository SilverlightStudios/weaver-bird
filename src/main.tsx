import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './app.css'

// Import test utilities in development mode for browser console access
if (import.meta.env.DEV) {
  import('@lib/test').then((testUtils) => {
    console.log('[Dev] Test utilities loaded. Available commands:');
    console.log('  - runTestAndReport()             - RUN THIS: Test all blocks and get error report');
    console.log('  - testAllBlocks(options)         - Test all blocks with options');
    console.log('  - testBlocksStopOnError(options) - Stop on first error');
    console.log('  - testBlocksByPattern(pattern)   - Test by pattern');
    console.log('  - getUniqueBlockStateIds()       - List unique blockstate IDs');

    // Make available globally for easy access
    Object.assign(window, testUtils);
  });
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

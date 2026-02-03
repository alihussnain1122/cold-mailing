// Timer Web Worker - runs in background without throttling
let timerId = null;

self.onmessage = function(e) {
  const { type, duration } = e.data;
  
  if (type === 'start') {
    // Clear any existing timer
    if (timerId) {
      clearInterval(timerId);
    }
    
    let remaining = duration;
    
    // Send initial countdown
    self.postMessage({ type: 'tick', remaining });
    
    timerId = setInterval(() => {
      remaining -= 1000;
      
      if (remaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        self.postMessage({ type: 'complete' });
      } else {
        self.postMessage({ type: 'tick', remaining });
      }
    }, 1000);
  }
  
  if (type === 'stop') {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    self.postMessage({ type: 'stopped' });
  }
};

import '@testing-library/jest-dom';

if (typeof URL.createObjectURL === 'undefined') {
  let blobCounter = 0;
  URL.createObjectURL = () => {
    blobCounter += 1;
    return `blob:amapa-test-${blobCounter}`;
  };
}

if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {};
}

// Provide a lightweight 2D canvas context mock and HTMLMediaElement mocks for jsdom tests
HTMLCanvasElement.prototype.toDataURL = function () {
  return 'data:image/jpeg;base64,amapa-mock-thumb';
};

HTMLMediaElement.prototype.load = function () {};
HTMLMediaElement.prototype.play = function () {
  return Promise.resolve();
};
HTMLMediaElement.prototype.pause = function () {};

// Automatically fire onload / onloadedmetadata in jsdom so media probing is instantaneous in tests
Object.defineProperty(HTMLImageElement.prototype, 'src', {
  set(val: string) {
    this.setAttribute('src', val);
    setTimeout(() => {
      if (typeof this.onload === 'function') {
        this.onload(new Event('load'));
      }
    }, 1);
  },
  get() {
    return this.getAttribute('src') || '';
  },
});

Object.defineProperty(HTMLMediaElement.prototype, 'src', {
  set(val: string) {
    this.setAttribute('src', val);
    setTimeout(() => {
      if (typeof this.onloadedmetadata === 'function') {
        this.onloadedmetadata(new Event('loadedmetadata'));
      }
      if (typeof this.onloadeddata === 'function') {
        this.onloadeddata(new Event('loadeddata'));
      }
    }, 1);
  },
  get() {
    return this.getAttribute('src') || '';
  },
});

const originalGetContext = HTMLCanvasElement.prototype.getContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(HTMLCanvasElement.prototype as any).getContext = function (contextId: string, options?: any) {
  if (contextId === '2d') {
    return {
      canvas: this,
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineJoin: 'round',
      globalAlpha: 1,
      filter: 'none',
      font: '16px sans-serif',
      textBaseline: 'middle',
      textAlign: 'center',
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      rect: () => {},
      roundRect: () => {},
      clip: () => {},
      fill: () => {},
      fillRect: () => {},
      clearRect: () => {},
      translate: () => {},
      rotate: () => {},
      scale: () => {},
      drawImage: () => {},
      strokeText: () => {},
      fillText: () => {},
      measureText: (text: string) => ({ width: text.length * 10 }),
    };
  }
  return originalGetContext ? originalGetContext.call(this, contextId as never, options) : null;
};

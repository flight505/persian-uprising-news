import '@testing-library/jest-dom';

// Mock environment variables
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
  type: 'service_account',
  project_id: 'test-project',
  private_key: '-----BEGIN PRIVATE KEY-----\nMOCK_KEY\n-----END PRIVATE KEY-----\n',
  client_email: 'test@test-project.iam.gserviceaccount.com',
});
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'mock_vapid_key';
process.env.VAPID_PUBLIC_KEY = 'mock_vapid_key';
process.env.VAPID_PRIVATE_KEY = 'mock_vapid_private_key';
process.env.VAPID_SUBJECT = 'mailto:test@example.com';

// Mock fetch
global.fetch = jest.fn();

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

// Mock Leaflet to prevent DOM-related errors
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: jest.fn(() => ({
    setView: jest.fn(),
    flyTo: jest.fn(),
  })),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};
global.indexedDB = mockIndexedDB;

// Mock Web Crypto API for hashing
const crypto = require('crypto');
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      digest: jest.fn((algorithm, data) => {
        const hash = crypto.createHash('sha256');
        hash.update(Buffer.from(data));
        return Promise.resolve(hash.digest().buffer);
      }),
    },
  },
});

import '@testing-library/jest-dom';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: vi.fn(() => null),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: vi.fn(({ children }) => children),
}));

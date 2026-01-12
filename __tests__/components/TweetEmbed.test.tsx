/**
 * TweetEmbed Component Tests
 *
 * Tests the Twitter embed functionality with real and fake URLs
 */

import { render, screen, waitFor } from '@testing-library/react';
import TweetEmbed from '@/app/components/Map/TweetEmbed';

// Mock Twitter widgets API
const mockCreateTweet = jest.fn();

beforeAll(() => {
  // Setup window.twttr mock
  Object.defineProperty(window, 'twttr', {
    writable: true,
    configurable: true,
    value: {
      widgets: {
        createTweet: mockCreateTweet,
      },
    },
  });
});

beforeEach(() => {
  mockCreateTweet.mockClear();
});

afterAll(() => {
  delete (window as any).twttr;
});

describe('TweetEmbed Component', () => {
  describe('Initial Rendering', () => {
    it('should render loading spinner while tweet is loading', () => {
      mockCreateTweet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      // Check for loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should render the component without crashing', () => {
      mockCreateTweet.mockResolvedValue(document.createElement('div'));

      const { container } = render(
        <TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />
      );

      expect(container).toBeTruthy();
    });
  });

  describe('URL Validation', () => {
    it('should show error for invalid Twitter URL', async () => {
      render(<TweetEmbed url="https://twitter.com/invalid" />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Twitter URL')).toBeInTheDocument();
      });
    });

    it('should extract tweet ID from valid URL', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      // Wait for createTweet to be called
      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalled();
      }, { timeout: 3000 });

      // Check that the correct tweet ID was extracted
      const calls = mockCreateTweet.mock.calls;
      if (calls.length > 0) {
        expect(calls[0][0]).toBe('1570742099144335361');
      }
    });
  });

  describe('Error States', () => {
    it('should display error message when tweet is not found', async () => {
      mockCreateTweet.mockResolvedValue(null); // Twitter API returns null for non-existent tweets

      render(<TweetEmbed url="https://twitter.com/fake/status/9999999999999999999" />);

      await waitFor(() => {
        expect(screen.getByText('Tweet not found or unavailable')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display error message when API fails', async () => {
      mockCreateTweet.mockRejectedValue(new Error('Network error'));

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load tweet')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "View on X" link when error occurs', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const link = screen.getByText('View on X').closest('a');
        expect(link).toHaveAttribute('href', 'https://twitter.com/BBCWorld/status/1570742099144335361');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }, { timeout: 3000 });
    });
  });

  describe('Dark Mode Support', () => {
    it('should use light theme by default', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalled();
      }, { timeout: 3000 });

      const calls = mockCreateTweet.mock.calls;
      if (calls.length > 0) {
        expect(calls[0][2]).toMatchObject({ theme: 'light' });
      }
    });

    it('should use dark theme when isDarkMode is true', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" isDarkMode={true} />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalled();
      }, { timeout: 3000 });

      const calls = mockCreateTweet.mock.calls;
      if (calls.length > 0) {
        expect(calls[0][2]).toMatchObject({ theme: 'dark' });
      }
    });
  });

  describe('Real vs Fake Twitter URLs', () => {
    it('should accept real verified Iran protest tweet URLs', async () => {
      const realTweetUrls = [
        'https://twitter.com/BBCWorld/status/1570742099144335361',
        'https://twitter.com/Reuters/status/1570794658458820608',
        'https://twitter.com/amnesty/status/1571119834849538048',
        'https://twitter.com/hrw/status/1570818467635838977',
        'https://twitter.com/AFP/status/1577275894636879872',
        'https://twitter.com/netblocks/status/1572280136471707648',
        'https://twitter.com/CNN/status/1572576988398149632',
        'https://twitter.com/guardian/status/1570754988762488832',
      ];

      for (const url of realTweetUrls) {
        const mockElement = document.createElement('div');
        mockCreateTweet.mockResolvedValue(mockElement);

        const { unmount } = render(<TweetEmbed url={url} />);

        await waitFor(() => {
          expect(mockCreateTweet).toHaveBeenCalled();
        }, { timeout: 3000 });

        mockCreateTweet.mockClear();
        unmount();
      }
    });

    it('should reject fake/invalid tweet IDs', async () => {
      // Simulate Twitter API returning null for fake tweet
      mockCreateTweet.mockResolvedValue(null);

      const fakeTweetUrls = [
        'https://twitter.com/fake/status/1574361943139430400',
        'https://twitter.com/fake/status/9999999999999999999',
      ];

      for (const url of fakeTweetUrls) {
        const { unmount } = render(<TweetEmbed url={url} />);

        await waitFor(() => {
          expect(screen.getByText('Tweet not found or unavailable')).toBeInTheDocument();
        }, { timeout: 3000 });

        unmount();
      }
    });
  });

  describe('Twitter Widget Configuration', () => {
    it('should configure widget with correct options', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalled();
      }, { timeout: 3000 });

      const calls = mockCreateTweet.mock.calls;
      if (calls.length > 0) {
        const options = calls[0][2];
        expect(options).toMatchObject({
          cards: 'visible',
          conversation: 'none',
          align: 'center',
          width: '100%',
        });
      }
    });
  });

  describe('Accessibility', () => {
    it('should have external link attributes on error fallback', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const link = screen.getByText('View on X').closest('a');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
      }, { timeout: 3000 });
    });
  });
});

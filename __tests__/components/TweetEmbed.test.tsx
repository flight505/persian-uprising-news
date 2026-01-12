import { render, screen, waitFor } from '@testing-library/react';
import TweetEmbed from '@/app/components/Map/TweetEmbed';

// Mock Twitter widgets API
const mockCreateTweet = jest.fn();
const originalTwttr = (global as any).window?.twttr;

beforeEach(() => {
  // Reset mock
  mockCreateTweet.mockClear();

  // Mock Twitter widgets API
  (global as any).window = {
    ...(global as any).window,
    twttr: {
      widgets: {
        createTweet: mockCreateTweet,
      },
    },
  };
});

afterEach(() => {
  // Restore original
  if (originalTwttr) {
    (global as any).window.twttr = originalTwttr;
  } else {
    delete (global as any).window?.twttr;
  }
});

describe('TweetEmbed Component', () => {
  describe('Rendering', () => {
    it('should render loading spinner initially', () => {
      mockCreateTweet.mockReturnValue(Promise.resolve(document.createElement('div')));

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should extract tweet ID from URL correctly', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledWith(
          '1570742099144335361',
          expect.any(HTMLElement),
          expect.objectContaining({
            theme: 'light',
            cards: 'visible',
            conversation: 'none',
            align: 'center',
            width: '100%',
          })
        );
      });
    });

    it('should support dark mode', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" isDarkMode={true} />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledWith(
          '1570742099144335361',
          expect.any(HTMLElement),
          expect.objectContaining({
            theme: 'dark',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message for invalid URL', async () => {
      render(<TweetEmbed url="https://twitter.com/invalid" />);

      await waitFor(() => {
        expect(screen.getByText('Invalid Twitter URL')).toBeInTheDocument();
      });
    });

    it('should show error message when tweet is not found', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/9999999999999999999" />);

      await waitFor(() => {
        expect(screen.getByText('Tweet not found or unavailable')).toBeInTheDocument();
      });
    });

    it('should show error message when Twitter widgets fail to load', async () => {
      mockCreateTweet.mockRejectedValue(new Error('Failed to load'));

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load tweet')).toBeInTheDocument();
      });
    });

    it('should display "View on X" link when error occurs', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const link = screen.getByText('View on X').closest('a');
        expect(link).toHaveAttribute('href', 'https://twitter.com/BBCWorld/status/1570742099144335361');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Twitter Widgets API Integration', () => {
    it('should load Twitter widgets script if not available', () => {
      // Remove twttr from window
      delete (global as any).window?.twttr;

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      // Check if script tag was added
      const scripts = document.querySelectorAll('script[src="https://platform.twitter.com/widgets.js"]');
      expect(scripts.length).toBeGreaterThan(0);
    });

    it('should reuse existing Twitter widgets instance', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      // Ensure twttr exists
      (global as any).window.twttr = {
        widgets: {
          createTweet: mockCreateTweet,
        },
      };

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledTimes(1);
      });
    });

    it('should clear previous content before rendering new tweet', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      const { rerender } = render(
        <TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />
      );

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledTimes(1);
      });

      // Clear and rerender with different URL
      mockCreateTweet.mockClear();

      rerender(<TweetEmbed url="https://twitter.com/Reuters/status/1570794658458820608" />);

      await waitFor(() => {
        expect(mockCreateTweet).toHaveBeenCalledWith(
          '1570794658458820608',
          expect.any(HTMLElement),
          expect.any(Object)
        );
      });
    });
  });

  describe('Real vs Fake URLs', () => {
    it('should handle real verified Twitter URLs', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      const realUrls = [
        'https://twitter.com/BBCWorld/status/1570742099144335361',
        'https://twitter.com/Reuters/status/1570794658458820608',
        'https://twitter.com/amnesty/status/1571119834849538048',
        'https://twitter.com/hrw/status/1570818467635838977',
      ];

      for (const url of realUrls) {
        const { unmount } = render(<TweetEmbed url={url} />);

        await waitFor(() => {
          expect(mockCreateTweet).toHaveBeenCalled();
        });

        mockCreateTweet.mockClear();
        unmount();
      }
    });

    it('should show error for non-existent tweet IDs', async () => {
      // Simulate Twitter API returning null for non-existent tweets
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/fake/status/1574361943139430400" />);

      await waitFor(() => {
        expect(screen.getByText('Tweet not found or unavailable')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show spinner while loading', () => {
      mockCreateTweet.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should hide spinner after successful load', async () => {
      const mockElement = document.createElement('div');
      mockCreateTweet.mockResolvedValue(mockElement);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });

    it('should hide spinner after error', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for external link', async () => {
      mockCreateTweet.mockResolvedValue(null);

      render(<TweetEmbed url="https://twitter.com/BBCWorld/status/1570742099144335361" />);

      await waitFor(() => {
        const link = screen.getByText('View on X').closest('a');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });
});

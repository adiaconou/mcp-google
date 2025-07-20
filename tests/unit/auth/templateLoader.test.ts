/**
 * Template Loader Tests
 * 
 * Tests for the OAuth HTML template loading and variable substitution functionality.
 */

import { templateLoader, TemplateLoader } from '../../../src/auth/templates';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('TemplateLoader', () => {
  let loader: TemplateLoader;

  beforeEach(() => {
    loader = new TemplateLoader();
    loader.clearCache();
  });

  afterEach(() => {
    loader.clearCache();
  });

  describe('loadSuccessTemplate', () => {
    it('should load success template with default auto-close delay', async () => {
      const html = await loader.loadSuccessTemplate();
      
      expect(html).toContain('Authentication Successful!');
      expect(html).toContain('const autoCloseSeconds = parseInt(\'3\') || 3;');
      expect(html).toContain('const autoCloseDelay = parseInt(\'3000\') || 3000;');
      expect(html).toContain('<span id="timer">3</span>');
    });

    it('should load success template with custom auto-close delay', async () => {
      const html = await loader.loadSuccessTemplate(5000);
      
      expect(html).toContain('Authentication Successful!');
      expect(html).toContain('const autoCloseSeconds = parseInt(\'5\') || 3;');
      expect(html).toContain('const autoCloseDelay = parseInt(\'5000\') || 3000;');
      expect(html).toContain('<span id="timer">5</span>');
    });

    it('should produce valid JavaScript without syntax errors', async () => {
      const html = await loader.loadSuccessTemplate(2000);
      
      // Extract JavaScript content
      const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
      expect(scriptMatch).toBeTruthy();
      
      const jsContent = scriptMatch![1];
      
      // Check that variables are properly substituted
      expect(jsContent).toContain('const autoCloseSeconds = parseInt(\'2\') || 3;');
      expect(jsContent).toContain('const autoCloseDelay = parseInt(\'2000\') || 3000;');
      
      // Ensure no template placeholders remain
      expect(jsContent).not.toContain('{{');
      expect(jsContent).not.toContain('}}');
    });
  });

  describe('loadErrorTemplate', () => {
    it('should load error template with custom title and message', async () => {
      const title = 'Test Error';
      const message = 'This is a test error message';
      
      const html = await loader.loadErrorTemplate(title, message);
      
      expect(html).toContain('Authentication Error');
      expect(html).toContain(title);
      expect(html).toContain(message);
      expect(html).toContain('Please close this window and try the authentication process again.');
    });

    it('should escape HTML in title and message', async () => {
      const title = '<script>alert("xss")</script>';
      const message = 'Error with <b>HTML</b> content';
      
      const html = await loader.loadErrorTemplate(title, message);
      
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;b&gt;HTML&lt;/b&gt;');
      expect(html).not.toContain('<script>alert');
      expect(html).not.toContain('<b>HTML</b>');
    });
  });

  describe('fallback templates', () => {
    it('should provide fallback success HTML', () => {
      const html = loader.getFallbackSuccessHtml();
      
      expect(html).toContain('Authentication Successful!');
      expect(html).toContain('You have successfully authenticated');
      expect(html).toContain('You can close this window now');
    });

    it('should provide fallback error HTML with escaped content', () => {
      const title = '<script>alert("test")</script>';
      const message = 'Error with <b>formatting</b>';
      
      const html = loader.getFallbackErrorHtml(title, message);
      
      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;b&gt;formatting&lt;/b&gt;');
      expect(html).not.toContain('<script>alert');
    });
  });

  describe('template caching', () => {
    it('should cache template content after first load', async () => {
      // Load template twice
      const html1 = await loader.loadSuccessTemplate();
      const html2 = await loader.loadSuccessTemplate();
      
      expect(html1).toBe(html2);
    });

    it('should clear cache when requested', async () => {
      await loader.loadSuccessTemplate();
      loader.clearCache();
      
      // Should be able to load again after cache clear
      const html = await loader.loadSuccessTemplate();
      expect(html).toContain('Authentication Successful!');
    });
  });

  describe('variable substitution edge cases', () => {
    it('should handle missing variables with defaults', async () => {
      // Create a template with unsubstituted placeholders
      const testTemplate = 'Test {{unknownVariable}} and {{autoCloseSeconds}}';
      
      // Mock the template loading to return our test template
      const originalGetTemplateContent = (loader as any).getTemplateContent;
      (loader as any).getTemplateContent = jest.fn().mockResolvedValue(testTemplate);
      
      const result = await loader.loadTemplate('test', {});
      
      // Should substitute known defaults and warn about unknown
      expect(result).toContain('Test {{unknownVariable}} and 3');
      
      // Restore original method
      (loader as any).getTemplateContent = originalGetTemplateContent;
    });
  });

  describe('error handling', () => {
    it('should throw error when template file does not exist', async () => {
      await expect(loader.loadTemplate('nonexistent')).rejects.toThrow(
        'Failed to load template \'nonexistent\''
      );
    });

    it('should handle file system errors gracefully', async () => {
      // Mock fs.readFile to throw an error
      const originalReadFile = fs.readFile;
      (fs as any).readFile = jest.fn().mockRejectedValue(new Error('File system error'));
      
      await expect(loader.loadTemplate('success')).rejects.toThrow(
        'Failed to load template \'success\': File system error'
      );
      
      // Restore original method
      (fs as any).readFile = originalReadFile;
    });
  });
});

describe('Global templateLoader instance', () => {
  it('should be available as a singleton', () => {
    expect(templateLoader).toBeDefined();
    expect(templateLoader).toBeInstanceOf(TemplateLoader);
  });

  it('should maintain state across calls', async () => {
    // Load a template to populate cache
    await templateLoader.loadSuccessTemplate();
    
    // Load again - should use cache
    const html = await templateLoader.loadSuccessTemplate();
    expect(html).toContain('Authentication Successful!');
  });
});

import * as path from 'path';
import * as os from 'os';

describe('Utils Tests', () => {
  describe('Path Handling', () => {
    test('Should join paths correctly', () => {
      const result = path.join('dir1', 'dir2', 'file.txt');
      expect(result).toMatch(/dir1[\/\\]dir2[\/\\]file\.txt/);
    });
    
    test('Should resolve home directory path', () => {
      const homePath = os.homedir();
      expect(homePath).toBeTruthy();
      expect(typeof homePath).toBe('string');
    });
    
    test('Should handle path normalization', () => {
      const normalizedPath = path.normalize('dir1//dir2/../dir3/./file.txt');
      expect(normalizedPath).toMatch(/dir1[\/\\]dir3[\/\\]file\.txt/);
    });
  });
  
  describe('Platform Detection', () => {
    test('Should detect operating system', () => {
      const platform = os.platform();
      expect(['win32', 'darwin', 'linux']).toContain(platform);
    });
    
    test('Should detect architecture', () => {
      const arch = os.arch();
      expect(['x64', 'arm64', 'ia32']).toContain(arch);
    });
  });
  
  describe('String Utilities', () => {
    test('Should match error pattern in log', () => {
      const logLine = 'Error: Command "node" not found in PATH';
      const pattern = /Command\s+"([^"]+)"\s+not found/;
      
      const match = logLine.match(pattern);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('node');
    });
    
    test('Should extract command name from error message', () => {
      const errorMessage = 'Command "npm" not found in PATH';
      const match = errorMessage.match(/\"([^\"]+)\"/);
      
      expect(match).not.toBeNull();
      expect(match![1]).toBe('npm');
    });
  });
});

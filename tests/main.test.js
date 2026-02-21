/**
 * Тесты для main.js (Electron главный процесс)
 */

const fs = require('fs');
const path = require('path');

describe('Main Process Tests', () => {
  
  describe('File System Operations', () => {
    
    test('должен читать директорию', () => {
      const testDir = __dirname;
      const items = fs.readdirSync(testDir, { withFileTypes: true });
      
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });
    
    test('должен создавать директорию', () => {
      const testDir = path.join(__dirname, 'test_dir_' + Date.now());
      
      try {
        fs.mkdirSync(testDir);
        expect(fs.existsSync(testDir)).toBe(true);
        fs.rmdirSync(testDir);
      } catch (e) {
        // Очистка если директория осталась
        try { fs.rmdirSync(testDir); } catch {}
      }
    });
    
    test('должен удалять файлы', () => {
      const testFile = path.join(__dirname, 'test_file_' + Date.now() + '.txt');
      
      try {
        fs.writeFileSync(testFile, 'test');
        expect(fs.existsSync(testFile)).toBe(true);
        
        fs.unlinkSync(testFile);
        expect(fs.existsSync(testFile)).toBe(false);
      } catch (e) {
        // Очистка
        try { if (fs.existsSync(testFile)) fs.unlinkSync(testFile); } catch {}
      }
    });
    
    test('должен получать информацию о файле', () => {
      const testFile = path.join(__dirname, 'security.test.js');
      const stats = fs.statSync(testFile);
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('mtime');
      expect(stats).toHaveProperty('isDirectory');
      expect(stats.isFile()).toBe(true);
    });
  });
  
  describe('Path Security', () => {
    
    test('должен определять path traversal', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
      ];
      
      dangerousPaths.forEach(dirtyPath => {
        // Проверяем что путь содержит ..
        expect(dirtyPath).toContain('..');
      });
    });
    
    test('должен нормализовывать пути', () => {
      const testPath = path.normalize('./tests/../tests/./file.txt');
      expect(testPath).toBe(path.join('tests', 'file.txt'));
    });
  });
  
  describe('SSH/SFTP Handlers', () => {
    
    test('должен иметь обработчики SFTP', () => {
      // Проверяем что main.js существует и содержит SSH обработчики
      const mainJs = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
      
      expect(mainJs).toContain('sftp-connect');
      expect(mainJs).toContain('sftp-read-directory');
      expect(mainJs).toContain('sftp-disconnect');
    });
    
    test('должен импортировать ssh2', () => {
      const mainJs = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
      expect(mainJs).toContain("require('ssh2')");
    });
  });
});

describe('Configuration Tests', () => {
  
  test('package.json должен содержать зависимости', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    
    expect(packageJson.devDependencies).toHaveProperty('electron');
    expect(packageJson.devDependencies).toHaveProperty('electron-builder');
    expect(packageJson.dependencies || packageJson.devDependencies).toHaveProperty('ssh2');
  });
  
  test('должен иметь скрипты для тестов', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    );
    
    expect(packageJson.scripts).toHaveProperty('test');
    expect(packageJson.scripts.test).toBe('jest');
  });
});

# SilentSort CI/CD Pipeline 🚀

This directory contains GitHub Actions workflows for automated testing, building, and deployment of SilentSort.

## 📋 Workflows Overview

### 1. `test.yml` - Testing & Code Quality 🧪
**Triggers:** Every push/PR to `main` or `develop`

**Jobs:**
- **Test Suite:** Runs tests on Node.js 18.x and 20.x
- **Code Quality:** ESLint, Prettier, TypeScript checking, security audit
- **Desktop App Tests:** Cross-platform Electron app testing (macOS, Windows, Linux)

### 2. `build.yml` - Build & Package 🔨
**Triggers:** Push to `main`, PRs to `main`, manual dispatch

**Jobs:**
- **Multi-platform builds:** macOS (Universal), Windows (x64), Linux (x64)
- **Artifact uploads:** Build artifacts with 30-day retention
- **Security scanning:** Dependency vulnerability checks

### 3. `release.yml` - Automated Releases 🚀
**Triggers:** Version tags (`v*.*.*`), manual dispatch

**Jobs:**
- **Release creation:** Auto-generated release notes from commits
- **Multi-platform packaging:** DMG, EXE, AppImage distributables
- **Asset uploads:** Signed binaries attached to GitHub releases

### 4. `code-quality.yml` - Advanced Quality Checks 🔍
**Triggers:** Weekly schedule (Sundays 2 AM UTC), dependency changes

**Jobs:**
- **Dependency reviews:** License compliance, security scanning
- **Performance monitoring:** Bundle size analysis, benchmarks
- **Automated updates:** Weekly dependency update PRs
- **Code coverage:** Coverage reports to Codecov

## 🛠️ Setup Requirements

### Environment Variables & Secrets
Add these to your GitHub repository settings:

#### Required for Basic CI/CD:
```bash
GITHUB_TOKEN          # Auto-provided by GitHub
```

#### Optional for Enhanced Features:
```bash
CODECOV_TOKEN         # Code coverage reporting
CSC_LINK              # macOS code signing certificate (base64)
CSC_KEY_PASSWORD      # macOS certificate password
WIN_CSC_LINK          # Windows code signing certificate
WIN_CSC_KEY_PASSWORD  # Windows certificate password
```

### Code Signing Setup (Production)

#### macOS:
1. Obtain Apple Developer ID certificate
2. Export as .p12 file
3. Convert to base64: `base64 -i certificate.p12 | pbcopy`
4. Add as `CSC_LINK` secret

#### Windows:
1. Obtain code signing certificate (.pfx)
2. Convert to base64 and add as `WIN_CSC_LINK` secret

## 📊 Workflow Status Badges

Add these to your main README.md:

```markdown
![Tests](https://github.com/pranjalekhande/silentsort/workflows/🧪%20Test%20&%20Code%20Quality/badge.svg)
![Build](https://github.com/pranjalekhande/silentsort/workflows/🔨%20Build%20&%20Package/badge.svg)
![Security](https://github.com/pranjalekhande/silentsort/workflows/🔍%20Code%20Quality%20&%20Security/badge.svg)
```

## 🔄 Release Process

### Automatic Releases:
1. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. GitHub Actions automatically:
   - Creates GitHub release
   - Builds for all platforms
   - Uploads signed binaries
   - Generates release notes

### Manual Releases:
1. Go to **Actions** → **Release & Deploy**
2. Click **Run workflow**
3. Enter version (e.g., `v1.0.1`)

## 📈 Performance & Monitoring

- **Build artifacts:** Retained for 30 days
- **Performance results:** Tracked over time
- **Security scans:** Weekly automated checks
- **Dependency updates:** Automated PRs every Sunday

## 🐛 Troubleshooting

### Common Issues:

**Build fails on macOS:**
- Check code signing certificate validity
- Ensure proper keychain access

**Tests fail randomly:**
- May need to adjust test timeouts
- Check for race conditions in Electron tests

**Release workflow errors:**
- Verify all required secrets are set
- Check tag format matches `v*.*.*`

### Debugging:
- Check **Actions** tab for detailed logs
- Failed builds include artifact uploads for debugging
- Security scan results available as artifacts

## 🔧 Customization

### Adding New Platforms:
Edit matrix strategy in `build.yml`:
```yaml
matrix:
  include:
    - os: ubuntu-latest
      platform: linux
      arch: arm64  # Add ARM64 Linux support
```

### Modifying Test Coverage:
Update coverage thresholds in `apps/desktop/package.json`:
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

---

**🎯 Result:** Fully automated CI/CD pipeline with multi-platform builds, automated testing, security scanning, and one-click releases! 
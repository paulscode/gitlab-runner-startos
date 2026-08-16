ARCHES := x86 arm
# overrides to s9pk.mk must precede the include statement
include node_modules/@start9labs/start-sdk/s9pk.mk

# "19.2.2:0" -> "19.2.2.0"
VERSION   := $(shell awk -F"'" '/version:/ {print $$2; exit}' startos/versions/current.ts | tr ':' '.')
BUILD_DIR := builds/$(VERSION)
SUFFIX    ?= -040
TAG       := v$(shell awk -F"'" '/version:/ {print $$2; exit}' startos/versions/current.ts | tr ':' '_')

# aarch64 ships marked untested, as GitLab's does -- see README.md.
RELEASE_ARCHES ?= x86_64 aarch64

.PHONY: release
release:
	@for sig in $(BUILD_DIR)/SHA256SUMS.asc $(BUILD_DIR)/SHA256SUMS.sig $(BUILD_DIR)/SHA256SUMS.gpg; do \
	  if [ -e "$$sig" ] && [ -z "$(FORCE)" ]; then \
	    echo "$$sig exists — rebuilding would invalidate that signature."; \
	    echo "Re-run with FORCE=1 to rebuild and re-sign."; exit 1; \
	  fi; \
	done
	@rm -rf $(BUILD_DIR); mkdir -p $(BUILD_DIR)
	@for a in $(RELEASE_ARCHES); do \
	  $(MAKE) --no-print-directory arch/$$a || exit 1; \
	  mv $(PACKAGE_ID)_$$a.s9pk $(BUILD_DIR)/$(PACKAGE_ID)_$$a$(SUFFIX).s9pk; \
	done
	@cd $(BUILD_DIR) && sha256sum *.s9pk > SHA256SUMS
	@echo "→ $(BUILD_DIR)/"

.PHONY: print-tag
print-tag:
	@echo '$(TAG)'


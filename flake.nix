{
  description = "Obsidian Datacore Kanban Plugin Development Environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20        # Node.js 20 LTS
            nodePackages.npm # npm package manager
            nodePackages.typescript # TypeScript compiler
            nodePackages.eslint     # Code linting
            esbuild         # Fast bundler
            git             # Version control
            
            # Development tools
            nodePackages.prettier
            nodePackages.typescript-language-server
          ];

          shellHook = ''
            echo "🚀 Obsidian Datacore Kanban Plugin Development Environment"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "📦 Node.js: $(node --version)"
            echo "📦 npm: $(npm --version)"
            echo "📦 TypeScript: $(tsc --version)"
            echo "📦 esbuild: $(esbuild --version)"
            echo ""
            echo "🔧 Available commands:"
            echo "  npm install     - Install dependencies"
            echo "  npm run dev     - Watch mode development"
            echo "  npm run build   - Production build"
            echo "  npm run lint    - Code linting"
            echo "  npm run check   - TypeScript type checking"
            echo "  npm run clean   - Clean build artifacts"
            echo ""
            echo "🎯 Quick start:"
            echo "  1. npm install"
            echo "  2. npm run dev"
            echo "  3. Copy built files to your Obsidian vault's plugins folder"
            echo ""
            echo "📁 Plugin path: .obsidian/plugins/obsidian-datacore-kanban/"
            echo ""
            
            # Auto-install dependencies if package-lock.json doesn't exist
            if [ ! -f package-lock.json ]; then
              echo "🔄 Installing dependencies..."
              npm install
            fi
          '';

          # Environment variables
          NODE_ENV = "development";
          
          # Helpful aliases - commented out due to Nix compatibility issue
          # shellAliases = {
          #   dev = "npm run dev";
          #   build = "npm run build";
          #   lint = "npm run lint";
          #   check = "npm run check";
          #   clean = "npm run clean";
          #   obsidian-link = "ln -sf $(pwd) ~/.obsidian/plugins/obsidian-datacore-kanban";
          # };
        };

        # Optional: Add a build derivation for CI/CD
        packages.default = pkgs.stdenv.mkDerivation {
          pname = "obsidian-datacore-kanban";
          version = "1.0.0";
          
          src = ./.;
          
          buildInputs = with pkgs; [ nodejs_20 ];
          
          buildPhase = ''
            npm ci
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out
            cp main.js manifest.json $out/
            cp -r styles $out/ 2>/dev/null || true
          '';
        };
      });
}
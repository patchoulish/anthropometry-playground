{
  description = "anthropometry-playground";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    flake-compat = {
      url = "github:NixOS/flake-compat";
      flake = false;
    };
    flakey-profile.url = "github:lf-/flakey-profile";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      flake-compat,
      flakey-profile,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = (import nixpkgs) {
          inherit system;
        };

        requiredPackages = with pkgs; [
          # For development.
          nodejs_24

          # For source control.
          git

          # For command recipes.
          just

          # For pre-commit hooks.
          pre-commit

          # For formatting.
          treefmt
          nixfmt-rfc-style
          toml-sort
          prettier
          djlint
        ];
      in
      {
        # For `nix run .#profile.switch`.
        packages.profile = flakey-profile.lib.mkProfile {
          inherit pkgs;

          pinned = {
            nixpkgs = toString nixpkgs;
          };
          paths = requiredPackages;
        };

        # For `nix develop`.
        devShells.default = pkgs.mkShell {
          name = "anthropometry-playground-dev";

          packages = requiredPackages;

          shellHook = ''
            
                        echo "Setting up Git hooks..."
                        if [ -f .git/hooks/pre-commit ]; then
                          echo "Git hooks already installed."
                        else
                          pre-commit install
                          echo "Git hooks installed."
                        fi
                        echo "Updating Node dependencies..."
                        npm install
                        echo "Node dependencies updated."
                        echo ""
                        echo "Welcome to the anthropometry-playground development shell."
                        echo "Run 'just' to see available recipes."
          '';
        };
      }
    );
}

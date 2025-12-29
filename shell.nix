{
  pkgs ? import <nixpkgs> { },
}:
pkgs.mkShell {
  name = "anthropometry-playground-dev";

  packages = with pkgs; [
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
  ];

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
}

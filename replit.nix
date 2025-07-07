{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.yarn
    pkgs.esbuild
    pkgs.nodejs-20_x.pkgs.npm
    pkgs.nodejs-20_x.pkgs.pnpm
  ];
  env = {
    LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      # Add any system libraries here
    ];
  };
}
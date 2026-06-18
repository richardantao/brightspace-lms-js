import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm", "cjs"],
	target: "node18",
	outDir: "dist",
	sourcemap: true,
	clean: true,
	dts: false,
});

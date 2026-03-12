import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: false, // Strict Mode double-mounts effects, breaking SpeechRecognition
};

export default nextConfig;

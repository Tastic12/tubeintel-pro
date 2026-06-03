/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'sharp'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals;
      const packages = ['@xenova/transformers', 'onnxruntime-node', 'sharp'];
      if (Array.isArray(externals)) {
        config.externals = [...externals, ...packages];
      } else if (typeof externals === 'function') {
        config.externals = async (ctx, request, callback) => {
          if (packages.some((p) => request === p || request.startsWith(`${p}/`))) {
            return callback(null, `commonjs ${request}`);
          }
          return externals(ctx, request, callback);
        };
      } else {
        config.externals = packages;
      }
    }
    return config;
  },
};

export default nextConfig;

'use strict';
const path = require('path');
const through = require('through2');
const PluginError = require('plugin-error');
const cloudinary = require('cloudinary').v2;
const Vinyl = require('vinyl');
const vinylFile = require('vinyl-file');

module.exports = (options) => {
  if (!process.env.CLOUDINARY_URL) {
    if (!options.config) {
      throw new PluginError(
        'gulp-cloudinary-upload',
        'Missing cloudinary config',
        {showProperties: false}
      );
    }

    cloudinary.config(options.config);
  }

  return through.obj((file, enc, cb) => {
    const uploadParameters = {
      overwrite: false,
      filename: file.stem,
      use_filename: true,
      unique_filename: false,
      ...options.params
    };

    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isBuffer()) {
      cloudinary.uploader
        .upload_stream(uploadParameters, (error, result) => {
          if (error) {
            return cb(new PluginError('gulp-cloudinary-upload', error.message));
          }

          file.cloudinary = result;
          return cb(null, file);
        })
        .end(file.contents);
    }

    if (file.isStream()) {
      file.contents.pipe(
        cloudinary.uploader.upload_stream(uploadParameters, (error, result) => {
          if (error) {
            return cb(new PluginError('gulp-cloudinary-upload', error.message));
          }

          file.cloudinary = result;
          return cb(null, file);
        })
      );
    }
  });
};

const getManifestFile = (options) =>
  vinylFile.read(options.path, options).catch((error) => {
    if (error.code === 'ENOENT') {
      return new Vinyl(options);
    }

    throw error;
  });

module.exports.manifest = (options) => {
  options = {
    path: 'cloudinary-manifest.json',
    merge: false,
    ...options
  };
  options.base = path.dirname(options.path);

  let manifest = {};

  return through.obj(
    (file, enc, cb) => {
      if (!file.cloudinary) {
        return cb();
      }

      const basename = path.basename(file.path);
      manifest[basename] = file.cloudinary;
      cb();
    },
    function (cb) {
      if (Object.keys(manifest).length === 0) {
        cb();
        return;
      }

      (async () => {
        try {
          const manifestFile = await getManifestFile(options);

          if (options.merge && !manifestFile.isNull()) {
            let oldManifest = {};

            try {
              oldManifest = JSON.parse(manifestFile.contents.toString());
            } catch {}

            manifest = Object.assign(oldManifest, manifest);
          }

          manifestFile.contents = Buffer.from(
            JSON.stringify(manifest, null, 2)
          );
          this.push(manifestFile);
          cb();
        } catch (error) {
          cb(error);
        }
      })();
    }
  );
};

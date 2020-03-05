const {join} = require('path');
const test = require('ava');
const pEvent = require('p-event');
const Vinyl = require('vinyl');
const m = require('..');

const uploadResponse = {
  public_id: 'bluepixel',
  version: 1526590450,
  format: 'png',
  url: 'http://res.cloudinary.com/demo/image/upload/v1526590450/bluepixel.png'
};

const createFixture = async (options = {}) => {
  const stream = m.manifest(options);
  const data = pEvent(stream, 'data');

  const inputFile = new Vinyl({
    path: join(process.cwd(), 'src/images/bluepixel.png'),
    contents: Buffer.from('')
  });
  inputFile.cloudinary = uploadResponse;

  stream.end(inputFile);

  const file = await data;

  return file;
};

test('builds a manifest file', async t => {
  t.plan(2);

  const file = await createFixture();

  t.is(file.relative, 'cloudinary-manifest.json');
  t.deepEqual(JSON.parse(file.contents.toString()), {
    'bluepixel.png': uploadResponse
  });
});

test('allows naming the manifest file', async t => {
  t.plan(1);

  const path = 'manifest.json';
  const file = await createFixture({path});

  t.is(file.relative, path);
});

test('appends to an existing manifest file', async t => {
  t.plan(2);

  const manifestFixturePath = join(
    __dirname,
    'fixtures/cloudinary-manifest.json'
  );
  const file = await createFixture({
    path: manifestFixturePath,
    merge: true
  });

  t.is(file.relative, 'cloudinary-manifest.json');
  t.deepEqual(JSON.parse(file.contents.toString()), {
    'redpixel.png': {
      public_id: 'redpixel',
      version: 1798111345,
      format: 'png',
      url:
        'http://res.cloudinary.com/demo/image/upload/v1798111345/redpixel.png'
    },
    'bluepixel.png': {
      public_id: 'bluepixel',
      version: 1526590450,
      format: 'png',
      url:
        'http://res.cloudinary.com/demo/image/upload/v1526590450/bluepixel.png'
    }
  });
});

test('does not append to an existing manifest by default', async t => {
  t.plan(2);

  const manifestFixturePath = join(
    __dirname,
    'fixtures/cloudinary-manifest.json'
  );
  const file = await createFixture({
    path: manifestFixturePath
  });

  t.is(file.relative, 'cloudinary-manifest.json');
  t.deepEqual(JSON.parse(file.contents.toString()), {
    'bluepixel.png': uploadResponse
  });
});

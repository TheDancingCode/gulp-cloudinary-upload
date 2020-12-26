const path = require('path');
const {readFileSync, createReadStream} = require('fs');
const test = require('ava');
const {v4: uuidv4} = require('uuid');
const pEvent = require('p-event');
const {v2: cloudinary} = require('cloudinary');
const Vinyl = require('vinyl');
const m = require('..');

const createFixture = async (options) => {
  options = options || {};
  const parameters = {...options.params};
  const stream = m({params: parameters});
  const data = pEvent(stream, 'data');

  const fixturePath = path.join(__dirname, 'fixtures/redpixel.png');
  const fixtureContents = options.streaming
    ? createReadStream(fixturePath)
    : readFileSync(fixturePath);

  stream.end(
    new Vinyl({
      path: path.join(process.cwd(), `src/images/${options.publicID}.png`),
      contents: fixtureContents
    })
  );

  const file = await data;

  return file;
};

test.beforeEach((t) => {
  t.context.publicID = uuidv4();
});

test.afterEach(async (t) => {
  t.plan(1);

  try {
    await cloudinary.uploader.destroy(t.context.publicID);
    t.pass();
  } catch {
    t.fail();
  }
});

test('uploads images in Buffer mode', async (t) => {
  t.plan(2);

  const file = await createFixture({publicID: t.context.publicID});

  t.true(file.isBuffer());
  try {
    await cloudinary.uploader.destroy(t.context.publicID);
    t.pass();
  } catch (error) {
    t.fail(error);
  }
});

test('uploads images in Streaming mode', async (t) => {
  t.plan(2);

  const file = await createFixture({
    publicID: t.context.publicID,
    streaming: true
  });

  t.true(file.isStream());
  try {
    await cloudinary.api.resource(file.stem);
    t.pass();
  } catch {
    t.fail();
  }
});

test('stores the upload response for later', async (t) => {
  t.plan(1);

  const file = await createFixture({publicID: t.context.publicID});

  t.truthy(file.cloudinary);
});

test('allows overwriting images', async (t) => {
  t.plan(1);

  await cloudinary.uploader.upload('test/fixtures/redpixel.png', {
    public_id: t.context.publicID
  });

  const file = await createFixture({
    publicID: t.context.publicID,
    params: {overwrite: true}
  });

  t.true(file.cloudinary.overwritten);
});

test('does not overwrite images by default', async (t) => {
  t.plan(1);

  await cloudinary.uploader.upload('test/fixtures/redpixel.png', {
    public_id: t.context.publicID
  });

  const file = await createFixture({publicID: t.context.publicID});

  t.falsy(file.cloudinary.overwritten);
});

test('accepts upload options', async (t) => {
  t.plan(1);

  const file = await createFixture({
    publicID: t.context.publicID,
    params: {tags: ['gulp-cloudinary-upload']}
  });

  t.is(file.cloudinary.tags[0], 'gulp-cloudinary-upload');
});

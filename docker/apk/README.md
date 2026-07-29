# docker/apk

Build-context slot for the Android APK that gets baked into the image and served
from **Settings → Android app** (`GET /api/apk`).

The directory is committed deliberately, even though the APK itself is not: the
Dockerfile `COPY docker/apk/ /app/apk/` needs it to exist, and keeping it in the
repo means a plain `docker build` works with no Android toolchain — you just get an
image with no APK, and the download card says so.

CI fills it in: the `apk` job in `.github/workflows/docker-publish.yml` builds the
app and drops `oppailib.apk` here before the image build, so the client shipped by a
given image is the one built from that same commit.

To bake in your own build instead — a release APK signed with *your* keystore, which
can update an installed app in place where an unsigned one can't:

    cp android/app/build/outputs/apk/release/app-release.apk docker/apk/oppailib.apk
    docker build -t oppailib .

Or skip the image entirely and drop it next to the server's config at runtime:
`/config/oppailib.apk` is checked as a fallback and wins nothing — it is simply used
when the image has no APK baked in.

var Flickr = require('flickr-sdk');

module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');

    const flickrApiKey = "[API_KEY]";
const flickrUserId = "[USER_ID]";
const flickrCollectionId = "[COLLECTION_ID]";

try {
    const flickr = new Flickr(flickrApiKey);
    const {
      body: {
        collections: { collection },
      },
    } = await flickr.collections.getTree({
      user_id: flickrUserId,
      collection_id: flickrCollectionId,
    });

    const slaptopCollection = collection[0];
    const { set: albums } = slaptopCollection;

    // Fetch photos for each album
    const promises = albums.map(async (album) => {
      album.photos = [];
      const {
        body: {
          photoset: { photo: photos },
        },
      } = await flickr.photosets.getPhotos({
        user_id: flickrUserId,
        photoset_id: album.id,
      });

      // Fetch photo info for each photo
      const photoPromises = photos.map(async (photo) => {
        const [picInfo, picExif, picContext] = await Promise.all([
          flickr.photos.getInfo({ photo_id: photo.id }),
          flickr.photos.getExif({ photo_id: photo.id }),
          flickr.photosets.getContext({
            photoset_id: album.id,
            photo_id: photo.id,
          }),
        ]);

        if (
          picInfo.status === "rejected" ||
          picExif.status === "rejected" ||
          picContext.status === "rejected"
        ) {
          console.error("Error fetching photo info");
          return null;
        }

        const tags = [
          "Make",
          "Model",
          "Flash",
          "FNumber",
          "FocalLength",
          "ExposureTime",
          "ISO",
        ];
        const exifs = picExif.body.photo.exif.reduce((acc, cur) => {
          if (tags.includes(cur.tag)) {
            acc[cur.tag] = cur.raw._content;
          }
          return acc;
        }, {});

        const pic = {
          id: picInfo.body.photo.id,
          date_taken: picInfo.body.photo.dates.taken,
          album: album.title,
          title: picInfo.body.photo.title._content,
          url: `https://live.staticflickr.com/${picInfo.body.photo.server}/${picInfo.body.photo.id}_${picInfo.body.photo.secret}.jpg`,
          exif: exifs,
          context: {
            length: picContext.body.count._content,
            id: picInfo.body.photo.id,
            _prevphoto_id: picContext.body.prevphoto.id,
            _prevphoto_: picContext.body.prevphoto.title,
            _nextphoto_id: picContext.body.nextphoto.id,
            _nextphoto_title: picContext.body.nextphoto.title,
          },
          geo: {
            country: picInfo.body.photo.location?.country?._content,
            region: picInfo.body.photo.location?.region?._content,
            county: picInfo.body.photo.location?.county?._content,
            locality: picInfo.body.photo.location?.locality?._content,
            neighbourhood: picInfo.body.photo.location?.neighbourhood?._content,
            
          },
          lat: picInfo.body.photo.location?.latitude,
            long: picInfo.body.photo.location?.longitude,
        };

        return pic;
      });

      const picResults = await Promise.allSettled(photoPromises);
      picResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          album.photos[index] = result.value;
        } else {
          console.error("Error fetching photo info");
        }
      });
      // sort album.photos based on the order of sortedPics
      album.photos.sort((a, b) => {
        const sortedPics = photos.map((photo) => photo.id);
        const aIndex = sortedPics.indexOf(a.id);
        const bIndex = sortedPics.indexOf(b.id);
        return aIndex - bIndex;
      });
    });

    await Promise.allSettled(promises);

    const responseJSON = albums
    context.res = {
        // status: 200, /* Defaults to 200 */
        body: responseJSON,
        contentType: 'application/json'
    };

    console.log("Flickr data fetched successfully :)");
  } catch (error) {
    console.error("Failed to fetch Flickr data:", error);
  }

    
}
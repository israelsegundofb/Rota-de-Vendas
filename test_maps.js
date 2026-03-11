const key = 'AIzaSyBLQx4DLs9ydWZqIOVsjkdPUC2rS0CrHXY';
fetch(`https://maps.googleapis.com/maps/api/js?key=${key}`)
  .then(res => res.text())
  .then(text => {
    if (text.includes('error:')) {
       const match = text.match(/error:\s*'([^']+)'|\"([^\"]+)\"/);
       console.log('MAPS API ERROR:', match ? (match[1] || match[2]) : 'Unknown Error String Check');
       console.log('RAW ERROR TEXT EXTRACT: ', text.substring(0, 150));
    } else {
       console.log('MAPS API LOADED SUCCESSFULLY');
    }
  }).catch(e => console.error(e));

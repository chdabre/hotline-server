const request = require('request')
const fs = require('fs')

export function downloadFile (url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination)
    const sendReq = request.get(url)

    // verify response code
    sendReq.on('response', (response) => {
      if (response.statusCode !== 200) {
        reject(new Error('Response status was ' + response.statusCode))
      }
      sendReq.pipe(file)
    })

    file.on('finish', () => {
      file.close()
      resolve()
    })

    // check for request errors
    sendReq.on('error', (err) => {
      fs.unlink(destination, () => {
        file.close()
        reject(err)
      })
    })

    file.on('error', (err) => { // Handle errors
      fs.unlink(destination, () => {
        file.close()
        reject(err)
      })
    })
  })
}

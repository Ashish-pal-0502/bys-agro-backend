const mongoose = require('mongoose')

const bottomBannerSchema = new mongoose.Schema({
    title: {
        type: String
    },
    image: {
        type: String
    }
})

const BottomBanner = mongoose.model('BottomBanner', bottomBannerSchema)

module.exports = BottomBanner

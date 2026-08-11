const asyncHandler = require('express-async-handler')
const ShopByConcern = require('../models/shopByConcernModel')

const addToShopByConcern = asyncHandler(async (req, res) => {
    const { title, details, image } = req.body

    await ShopByConcern.create({
        title,
        details,
        image
    })

    res.send({ message: "ShopByConcern Success"  })
})

const getByConcerns = asyncHandler(async (req, res) => {
    const { pageNumber = 1, pageSize = 20 } = req.query

    const [concerns, totalDocuments] = await Promise.all([
        ShopByConcern.find({  }).sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
        ShopByConcern.countDocuments({})
    ])

    const pageCount = Math.ceil(totalDocuments/pageSize)
    res.send({ concerns, pageCount  })

})


const getByConcernsForAdmin = asyncHandler(async (req, res) => {
    const concerns = await ShopByConcern.find({})
    res.send(concerns)
})

const getConcernById = asyncHandler(async (req, res) => {
    const { id } = req.query

    const concern = await ShopByConcern.findById(id)

    res.send({ concern })
})

const updateShopByConcern = asyncHandler(async (req, res) => {
    const { id, title, details, image } = req.body

    const concern = await ShopByConcern.findById(id)

    if(!concern) {
        return res.status(400).send({ message: "Concern not found" })
    }

    concern.id = id || concern.id
    concern.title = title || concern.title
    concern.details = details || concern.details
    concern.image = image || concern.image

    await concern.save()

    res.send({ message: "ShopByConcern updated" })
})

module.exports = {
    addToShopByConcern,
    getByConcerns,
    updateShopByConcern,
    getConcernById,
    getByConcernsForAdmin
}
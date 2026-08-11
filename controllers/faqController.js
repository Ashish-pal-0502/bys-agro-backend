const express = require('express');
const FAQ = require('../models/faqModel.js')
const asyncHandler = require('express-async-handler')

const addFAQ = asyncHandler(async (req, res) => {
  const { coreTitle, sections } = req.body;
  
  if (!coreTitle || !sections || sections.length === 0) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }

  const faqSection = await FAQ.findOne({})
  
  if(faqSection) {
    return res.status(400).send({ message: 'FAQs already exist' })
  }

  await FAQ.create({
        coreTitle, 
        sections
    })
  
  res.status(201).json({ message: 'FAQ added successfully' });
})

const getFAQ = asyncHandler(async (req, res) => {
   
    const faqs = await FAQ.findOne()
    if(!faqs) {
        return res.status(400).send({ message: 'FAQ not found' })
    }
    
    res.status(200).send({faqs})
})

const updateFAQ = asyncHandler(asyncHandler(async (req, res) => {
    const { coreTitle, sections } = req.body
 
    const faqExist = await FAQ.findOne({ })

    if(!faqExist) {
        return res.status(400).send({ message: "FAQ not exist" })
    }
    faqExist.coreTitle = coreTitle || faqExist.coreTitle
    faqExist.sections = sections || faqExist.sections

    await faqExist.save()

    res.status(200).send({ message: 'FAQ updated successfully' })
}))

const deleteFAQ = asyncHandler(async (req, res) => {
    const { id } = req.query

    const faqExist = await FAQ.findOne({ _id: id })
    if(!faqExist) {
        return res.status(400).send({ message: 'FAQ not exist' })
    }

     await FAQ.findOneAndDelete({ _id: id })

    res.status(200).send({  message: 'FAQ deleted successfully' })
})

module.exports = {
    addFAQ,
    getFAQ,
    updateFAQ,
    deleteFAQ
}

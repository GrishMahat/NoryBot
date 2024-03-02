const mongoose = require('mongoose');

const faceSchema = new mongoose.Schema({
  userId: {
    type: String, 
    required: true,
  },
  imageLink: {
    type: String,
    required: true,
  },
  addedBy: {
    type: String,
    required: true,
  },
  note: {
    type: String,
    required: false,
  },

});

const Face = mongoose.model('Face', faceSchema);

module.exports = Face;

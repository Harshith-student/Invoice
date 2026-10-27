import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    business: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      gstin: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);

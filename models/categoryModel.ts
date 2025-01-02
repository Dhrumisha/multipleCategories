import mongoose, { Document, Schema, Model, model } from "mongoose";

// Define the interface for the Category document
export interface ICategory extends Document {
  parentId?: Schema.Types.ObjectId | "0"; // Optional reference to the parent category
  name: string;
  description: string;
  status: "active" | "inactive"; // Enum: status must be either active or inactive
  stock_availability: boolean;
  children: mongoose.Types.ObjectId[]; // Array of references to child categories
  createdAt?: Date; // Auto-generated timestamp
  updatedAt?: Date; // Auto-generated timestamp
}

// Define the schema for the Category model
const CategorySchema: Schema<ICategory> = new Schema(
  {
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category", // Reference to the Category model
      default: "0",
    },
    name: {
      type: String,
      required: [true, "A category requires a name"],
      unique: true,
    },
    description: {
      type: String,
      // required: [true, "A category requires a description"],
      unique: true,
    },
    status: {
      type: String,
      required: [true, "A category requires a status"],
      default: "active",
    },
    stock_availability: {
      type: Boolean,
      default: false,
    },
    children: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  },
 
);

// to convert first character into uppercase and check special character
CategorySchema.pre("save",function(next){
 this.name = this.name[0].toUpperCase() + this.name.substring(1).toLowerCase().replace(/\s{2,}/g, " ");

next();
})

// Create and export the model
const Category: Model<ICategory> = model<ICategory>("Category", CategorySchema);

export default Category;

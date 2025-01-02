import AppError from "./AppError";

class APIFeatures {
  public pipeline: any[];
  public queryString: any;

  constructor(queryString: any) {
    this.pipeline = [];
    this.queryString = queryString;
  }

    Filtering(): this {
      const queryObj = { ...this.queryString };

      const excludedFields = ["page", "sort", "limit", "fields"];
      excludedFields.forEach((el) => delete queryObj[el]);
      if (queryObj.stock_availability !== undefined) {
        queryObj.stock_availability = queryObj.stock_availability === "true";
      }
      const matchStage = { $match: queryObj };
      this.pipeline.push(matchStage);
      return this;
    }

  sorting(): this {
    if (this.queryString.sort) {

      const sortBy: Record<string, number> = {};

      const sortingArray = this.queryString.sort.split(",");
      const allowedFields = ["name", "description", "status", "stock_availability", "createdAt", "updatedAt"];
      const allowedFieldsDesc = ["-name", "-description", "-status", "-stock_availability", "-createdAt", "-updatedAt"];

      const invalidFields = sortingArray.filter((field: string) => !allowedFields.includes(field) && !allowedFieldsDesc.includes(field));

      if (invalidFields.length > 0) {
        throw new AppError(
          `Invalid sorting field(s): ${invalidFields.join(
            ", "
          )}. Allowed fields for Ascending order are: ${allowedFields.join(", ")} and Allowed fields for Descending order are: ${allowedFieldsDesc.join(", ")}`,
          400
        );
      }

      sortingArray.forEach((field: string) => {
        const [key, order] = field.startsWith("-")
          ? [field.substring(1), -1] // Descending
          : [field, 1];             // Ascending
        sortBy[key] = order;
      });

      // Push the $sort stage to the aggregation pipeline
      this.pipeline.push({ $sort: sortBy });
    } else {
      // Default sorting by createdAt in descending order
      this.pipeline.push({ $sort: { createdAt: -1 } });
    }
    return this;
  }

  fieldLimit(): this {
    if (this.queryString.fields) {
      // Split the fields and map them into a valid $project object
      const fieldsArray = this.queryString.fields.split(",");
      const allowedFields = ["name", "description", "status", "createdAt", "updatedAt"];

      // Step 3: Validate requested sort fields
      const invalidFields = fieldsArray.filter((field: string) => !allowedFields.includes(field));

      if (invalidFields.length > 0) {
        throw new AppError(
          `Invalid field(s): ${invalidFields.join(
            ", "
          )}. Allowed fields are: ${allowedFields.join(", ")}`,
          400
        );
      }

      const projection: Record<string, number> = {};

      // Set each field to 1 to include it in the result
      fieldsArray.forEach((field: string | number) => {
        projection[field] = 1;
      });

      this.pipeline.push({ $project: projection });
    }
    return this;
  }


  paginate(): this {
    const page: number = parseInt(this.queryString.page, 10) || 1;
    const limit: number = parseInt(this.queryString.limit, 10) || 10;
    const skip: number = (page - 1) * limit;

    this.pipeline.push({ $skip: skip }, { $limit: limit });
    return this;
  }

  getPipeline(): any[] {
    return this.pipeline;
  }
}

export default APIFeatures;

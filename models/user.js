const userSchema = new mongoose.Schema({
   username: { type: String, required: true, unique: true },
   email: {
     type: String,
     required: true,
     unique: true,
     validate: {
       validator: function(v) {
         return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); // Simple email regex
       },
       message: props => `${props.value} is not a valid email!`
     }
   },
   password: { type: String, required: true },
 });
 
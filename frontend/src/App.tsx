import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./components/ui/form";
import { Input } from "./components/ui/input";
import "./globals.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "./components/ui/button";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const formSchema = z.object({
  image: z
    .any()
    .refine((file) => file?.size <= MAX_FILE_SIZE, "Max image size is 25MB.")
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
});

function App() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      image: "",
    },
  });
  const onSubmit = async (payload: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("image", payload.image);

    const response = await fetch("http://localhost:8000/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      console.error("Failed to send");
    } else {
      console.log("Send succesfully");
    }
  };

  return (
    <div className="w-full justify-center flex">
      <div className="min-w-screen-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Upload an image</FormLabel>
                  <FormControl>
                    <Input
                      id="image"
                      type="file"
                      {...field}
                      accept="image/*"
                      name="image"
                      required
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Submit</Button>
          </form>
        </Form>
        <div className="grid w-full max-w-sm items-center gap-1.5"></div>
      </div>
    </div>
  );
}

export default App;

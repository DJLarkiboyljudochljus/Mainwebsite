import Layout from "./layout";
import AnimateRoute from "./AnimatedRoute";

export default function Route({ title, description, keywords, children }) {
  return (
    <Layout title={title} description={description} keywords={keywords}>
      <AnimateRoute>{children}</AnimateRoute>
    </Layout>
  );
}

import { redirect } from "next/navigation";

/**
 * Adrian calls the hub "the ecosystem", so /ecosystem goes there rather than
 * 404ing. The hub itself stays Access-gated in production.
 */
export default function Ecosystem() {
  redirect("/hub");
}

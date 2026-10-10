"use client";

import { ArrowRight, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/components/auth-provider";
import { createManagedEvent, OrganizerApiError } from "@/lib/organizer-api";

import styles from "./event-form.module.css";

const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function EventForm() {
  const { isReady, session } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slug, setSlug] = useState("");
  const allowed = session?.user.role === "ORGANIZER" || session?.user.role === "ADMIN";

  const createEvent = async (formData: FormData) => {
    const startAt = String(formData.get("startAt") ?? "");
    const endAt = String(formData.get("endAt") ?? "");
    if (new Date(startAt).getTime() <= Date.now()) {
      toast.error("Your event must start in the future.");
      return;
    }
    if (new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      toast.error("The end time must be after the start time.");
      return;
    }
    if (!session) return;
    setIsSubmitting(true);
    try {
      await createManagedEvent(session.accessToken, {
        title: String(formData.get("title") ?? "").trim(),
        slug,
        description: String(formData.get("description") ?? "").trim(),
        category: String(formData.get("category") ?? "").trim(),
        venue: String(formData.get("venue") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        imageUrl: String(formData.get("imageUrl") ?? "").trim() || null,
      });
      toast.success("Draft event created.");
      router.push("/organizer");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof OrganizerApiError ? error.message : "Your event could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) return <p className={styles.loading}>Checking organizer access…</p>;
  if (!session || !allowed) return <section className={styles.gate}><h1>Organizer access required.</h1><p>Only organizer or admin accounts can create events.</p><Link className="button button-primary" href={session ? "/organizer" : "/auth/sign-in?next=/organizer/events/new"}>Continue <ArrowRight size={16} /></Link></section>;

  return (
    <form action={createEvent} className={styles.form}>
      <section className={styles.section}><p className="eyebrow"><span /> Event fundamentals</p><h2>Start with the <b>room.</b></h2><div className={styles.grid}>
        <label className={styles.wide}><span>Event title</span><input maxLength={180} name="title" onChange={(event) => setSlug(toSlug(event.target.value))} placeholder="e.g. Dhaka Design Night" required /></label>
        <label><span>Public URL slug</span><input maxLength={200} name="slug" onChange={(event) => setSlug(toSlug(event.target.value))} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="dhaka-design-night" required value={slug} /></label>
        <label><span>Category</span><input maxLength={80} minLength={2} name="category" placeholder="Design" required /></label>
        <label className={styles.wide}><span>Description</span><textarea minLength={20} name="description" placeholder="Describe what attendees can expect…" required rows={5} /></label>
      </div></section>
      <section className={styles.section}><p className="eyebrow"><span /> Date & place</p><h2>Set the <b>scene.</b></h2><div className={styles.grid}>
        <label><span>Starts</span><input name="startAt" required type="datetime-local" /></label>
        <label><span>Ends</span><input name="endAt" required type="datetime-local" /></label>
        <label><span>Venue</span><input maxLength={160} minLength={2} name="venue" placeholder="Venue name" required /></label>
        <label><span>City</span><input maxLength={100} minLength={2} name="city" placeholder="Dhaka" required /></label>
        <label className={styles.wide}><span>Full address</span><input minLength={5} name="address" placeholder="Street, area, city" required /></label>
      </div></section>
      <section className={styles.section}><p className="eyebrow"><span /> Optional visual</p><h2>Give it an <b>image.</b></h2><div className={styles.grid}><label className={styles.wide}><span>HTTPS image URL</span><input name="imageUrl" placeholder="https://…" type="url" /></label></div></section>
      <div className={styles.actions}><Link href="/organizer">Cancel</Link><button className="button button-primary" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className={styles.spinner} size={17} /> : <Save size={17} />} {isSubmitting ? "Creating draft" : "Create draft event"}</button></div>
    </form>
  );
}

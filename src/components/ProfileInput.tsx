import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserProfile } from "@/lib/types";
import { Upload, Github, Linkedin, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onSubmit: (profile: Partial<UserProfile>, role: string) => void;
  loading: boolean;
}

export const ProfileInput = ({ onSubmit, loading }: Props) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [resumeFilePath, setResumeFilePath] = useState<string | undefined>(undefined);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const extractPdfText = async (file: File): Promise<string> => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      pages.push(text);
    }

    return pages.join("\n").trim();
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file only.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("PDF must be 5MB or smaller.");
      return;
    }

    setUploadingPdf(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("You must be signed in to upload a resume.");

      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const storagePath = `${userData.user.id}/${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("resumes")
        .upload(storagePath, file, { upsert: false, contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const parsedText = await extractPdfText(file);
      if (!parsedText) throw new Error("PDF parsed but no text was extracted.");

      setResumeText(parsedText);
      setResumeFilePath(storagePath);
      setUploadedFileName(file.name);
      toast.success("PDF uploaded and parsed successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to process PDF.");
    } finally {
      setUploadingPdf(false);
      event.target.value = "";
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) return;

    const profile: Partial<UserProfile> = {
      name: name || undefined,
      experience_level: experience || undefined,
      skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      resume_text: resumeText || undefined,
      github_url: githubUrl || undefined,
      linkedin_url: linkedinUrl || undefined,
      resume_file_path: resumeFilePath,
    };

    onSubmit(profile, role.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      <div className="glass rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Your Profile
        </h2>
        <p className="text-sm text-muted-foreground">
          Only the dream role is required. More data = better analysis.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={experience} onValueChange={setExperience}>
            <SelectTrigger>
              <SelectValue placeholder="Experience level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="junior">Junior (0-2 years)</SelectItem>
              <SelectItem value="mid">Mid-level (2-5 years)</SelectItem>
              <SelectItem value="senior">Senior (5-10 years)</SelectItem>
              <SelectItem value="lead">Lead/Staff (10+ years)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Input placeholder="Skills (comma-separated, e.g. React, Python, AWS)" value={skills} onChange={(e) => setSkills(e.target.value)} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="GitHub URL (optional)" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Linkedin className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="LinkedIn URL (optional)" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Input type="file" accept="application/pdf" onChange={handlePdfUpload} disabled={uploadingPdf} />
          <p className="text-xs text-muted-foreground">
            {uploadingPdf ? "Uploading and parsing PDF..." : uploadedFileName ? `Loaded: ${uploadedFileName}` : "Optional: Upload a PDF resume for client-side extraction."}
          </p>
        </div>

        <Textarea
          placeholder="Paste resume text here (optional) or upload PDF above."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={4}
        />
      </div>

      <div className="glass rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Upload className="h-5 w-5 text-accent" />
          Dream Role
        </h2>
        <Input
          placeholder="e.g. Senior Frontend Engineer, ML Engineer, DevOps Lead..."
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className="text-lg"
        />
        <Button type="submit" className="w-full" disabled={loading || !role.trim() || uploadingPdf}>
          {loading ? "Analyzing..." : "Launch Analysis"}
        </Button>
      </div>
    </form>
  );
};

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CompanyDetails {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  licenseNumber: string;
  logoFile: File | null;
}

interface QuotingDefaults {
  laborMargin: number;
  materialMargin: number;
  paymentTerms: string;
  quoteValidityDays: number;
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ["Company Details", "Quoting Defaults", "Price List"];
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                isComplete
                  ? "bg-primary text-primary-foreground"
                  : isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {isComplete ? "✓" : stepNum}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                isActive ? "font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="mx-2 h-px w-8 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Company Details ──────────────────────────────────────────────────
function CompanyDetailsStep({
  data,
  onChange,
  errors,
}: {
  data: CompanyDetails;
  onChange: (d: CompanyDetails) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>
          This info appears on every quote you generate, so make sure it&apos;s
          accurate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Company name</Label>
          <Input
            id="name"
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Street address</Label>
          <Input
            id="address"
            value={data.address}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            placeholder="123 Main St"
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={data.city}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
            />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={data.state}
              onChange={(e) => onChange({ ...data, state: e.target.value })}
              placeholder="CO"
              maxLength={2}
            />
            {errors.state && (
              <p className="text-sm text-destructive">{errors.state}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="zipCode">Zip code</Label>
            <Input
              id="zipCode"
              value={data.zipCode}
              onChange={(e) => onChange({ ...data, zipCode: e.target.value })}
              placeholder="80202"
              maxLength={10}
            />
            {errors.zipCode && (
              <p className="text-sm text-destructive">{errors.zipCode}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            value={data.phone}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            placeholder="(555) 123-4567"
            type="tel"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="licenseNumber">
            Contractor license number{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="licenseNumber"
            value={data.licenseNumber}
            onChange={(e) =>
              onChange({ ...data, licenseNumber: e.target.value })
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="logo">
            Company logo{" "}
            <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="logo"
            type="file"
            accept=".png,.jpg,.jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > 5 * 1024 * 1024) {
                alert("Logo must be under 5MB");
                e.target.value = "";
                return;
              }
              onChange({ ...data, logoFile: file });
            }}
          />
          <p className="text-xs text-muted-foreground">
            PNG or JPG, max 5MB. This appears on your quotes.
          </p>
        </div>
      </CardContent>
    </>
  );
}

// ─── Step 2: Quoting Defaults ─────────────────────────────────────────────────
function QuotingDefaultsStep({
  data,
  onChange,
  errors,
}: {
  data: QuotingDefaults;
  onChange: (d: QuotingDefaults) => void;
  errors: Record<string, string>;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Quoting Defaults</CardTitle>
        <CardDescription>
          Set your standard margins and terms. You can override these on
          individual quotes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="laborMargin">Default labor margin %</Label>
            <Input
              id="laborMargin"
              type="number"
              min={0}
              max={100}
              value={data.laborMargin}
              onChange={(e) =>
                onChange({ ...data, laborMargin: Number(e.target.value) })
              }
            />
            {errors.laborMargin && (
              <p className="text-sm text-destructive">{errors.laborMargin}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialMargin">Default material margin %</Label>
            <Input
              id="materialMargin"
              type="number"
              min={0}
              max={100}
              value={data.materialMargin}
              onChange={(e) =>
                onChange({ ...data, materialMargin: Number(e.target.value) })
              }
            />
            {errors.materialMargin && (
              <p className="text-sm text-destructive">
                {errors.materialMargin}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentTerms">Default payment terms</Label>
          <Textarea
            id="paymentTerms"
            value={data.paymentTerms}
            onChange={(e) =>
              onChange({ ...data, paymentTerms: e.target.value })
            }
            rows={3}
          />
          {errors.paymentTerms && (
            <p className="text-sm text-destructive">{errors.paymentTerms}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quoteValidityDays">
            Quote validity period (days)
          </Label>
          <Input
            id="quoteValidityDays"
            type="number"
            min={1}
            max={365}
            value={data.quoteValidityDays}
            onChange={(e) =>
              onChange({
                ...data,
                quoteValidityDays: Number(e.target.value),
              })
            }
          />
          {errors.quoteValidityDays && (
            <p className="text-sm text-destructive">
              {errors.quoteValidityDays}
            </p>
          )}
        </div>
      </CardContent>
    </>
  );
}

// ─── Step 3: Price List Upload ────────────────────────────────────────────────
function PriceListStep({
  priceListFile,
  onFileChange,
}: {
  priceListFile: File | null;
  onFileChange: (f: File | null) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Upload Your Price List</CardTitle>
        <CardDescription>
          Upload your supplier price list for accurate pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          You can skip this now and add it later. Without your price list,
          quotes will use estimated national averages.
        </p>

        <div className="space-y-2">
          <Label htmlFor="priceList">Price list file</Label>
          <Input
            id="priceList"
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (file && file.size > 10 * 1024 * 1024) {
                alert("File must be under 10MB");
                e.target.value = "";
                return;
              }
              onFileChange(file);
            }}
          />
          <p className="text-xs text-muted-foreground">
            CSV or XLSX, max 10MB
          </p>
        </div>

        {priceListFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {priceListFile.name} (
            {(priceListFile.size / 1024).toFixed(0)} KB)
          </p>
        )}
      </CardContent>
    </>
  );
}

// ─── Main Onboarding Page ─────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [companyId, setCompanyId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Company details form state — name is pre-filled from signup
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    licenseNumber: "",
    logoFile: null,
  });

  // Quoting defaults — pre-filled with sensible starting values
  const [quotingDefaults, setQuotingDefaults] = useState<QuotingDefaults>({
    laborMargin: 20,
    materialMargin: 30,
    paymentTerms:
      "50% due upon acceptance, balance due upon completion",
    quoteValidityDays: 30,
  });

  const [priceListFile, setPriceListFile] = useState<File | null>(null);

  // Load existing company data on mount (pre-fill company name from signup)
  useEffect(() => {
    async function loadCompany() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        router.push("/login");
        return;
      }

      setCompanyId(profile.company_id);

      const { data: company } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (company) {
        // If onboarding is already complete, go to dashboard
        if (company.address) {
          router.push("/dashboard");
          return;
        }
        // Pre-fill company name from signup
        setCompanyDetails((prev) => ({ ...prev, name: company.name }));
      }

      setPageLoading(false);
    }

    loadCompany();
  }, [supabase, router]);

  // ─── Validation ───────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const newErrors: Record<string, string> = {};
    if (!companyDetails.name.trim()) newErrors.name = "Company name is required";
    if (!companyDetails.address.trim()) newErrors.address = "Address is required";
    if (!companyDetails.city.trim()) newErrors.city = "City is required";
    if (!companyDetails.state.trim()) newErrors.state = "State is required";
    if (!companyDetails.zipCode.trim()) newErrors.zipCode = "Zip code is required";
    if (!companyDetails.phone.trim()) newErrors.phone = "Phone number is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateStep2(): boolean {
    const newErrors: Record<string, string> = {};
    if (quotingDefaults.laborMargin < 0 || quotingDefaults.laborMargin > 100)
      newErrors.laborMargin = "Must be between 0 and 100";
    if (
      quotingDefaults.materialMargin < 0 ||
      quotingDefaults.materialMargin > 100
    )
      newErrors.materialMargin = "Must be between 0 and 100";
    if (!quotingDefaults.paymentTerms.trim())
      newErrors.paymentTerms = "Payment terms are required";
    if (
      quotingDefaults.quoteValidityDays < 1 ||
      quotingDefaults.quoteValidityDays > 365
    )
      newErrors.quoteValidityDays = "Must be between 1 and 365 days";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────
  function handleNext() {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  }

  function handleBack() {
    setErrors({});
    if (step > 1) setStep(step - 1);
  }

  // ─── Final Submit ─────────────────────────────────────────────────────────
  async function handleComplete(skip: boolean) {
    setLoading(true);

    try {
      // Build the full address string for the company record
      const fullAddress = `${companyDetails.address}, ${companyDetails.city}, ${companyDetails.state} ${companyDetails.zipCode}`;

      // Upload logo if provided
      let logoUrl: string | null = null;
      if (companyDetails.logoFile) {
        const fileExt = companyDetails.logoFile.name.split(".").pop();
        const filePath = `${companyId}/logo.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("company-logos")
          .upload(filePath, companyDetails.logoFile, { upsert: true });

        if (uploadError) {
          // Logo upload failed — not critical, continue without it.
          // The user can re-upload later in settings.
          console.warn("Logo upload failed:", uploadError.message);
        } else {
          // Store the storage path (e.g., "companyId/logo.png"), NOT the full public URL.
          // The PDF generator uses this path with supabase.storage.download() to fetch the image.
          logoUrl = filePath;
        }
      }

      // Upload price list if provided and not skipping, then parse it into
      // the product_catalog table so quote generation can match against it.
      if (!skip && priceListFile) {
        const filePath = `${companyId}/${priceListFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("price-lists")
          .upload(filePath, priceListFile, { upsert: true });

        if (uploadError) {
          setErrors({
            form: "Could not upload your price list: " + uploadError.message,
          });
          setLoading(false);
          return;
        }

        // Parse the file server-side and populate product_catalog.
        // If parsing fails, surface the error so the user can fix and retry —
        // a quote without their price list defeats the whole point of upload.
        const parseRes = await fetch("/api/parse-price-list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: priceListFile.name }),
        });
        const parseData = await parseRes.json();
        if (!parseRes.ok) {
          setErrors({
            form:
              parseData.error ||
              "Could not parse your price list. Make sure it's a CSV with item name + price columns.",
          });
          setLoading(false);
          return;
        }
        // Success — log the import count for confirmation in dev tools
        console.log(
          `Imported ${parseData.imported_count} items from price list` +
            (parseData.parse_errors?.length
              ? ` (${parseData.parse_errors.length} rows skipped)`
              : "")
        );
      }

      // Update the company record with all onboarding data
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          name: companyDetails.name,
          address: fullAddress,
          phone: companyDetails.phone,
          license_number: companyDetails.licenseNumber || null,
          logo_url: logoUrl,
          zip_code: companyDetails.zipCode,
          default_labor_margin: quotingDefaults.laborMargin,
          default_material_margin: quotingDefaults.materialMargin,
          default_payment_terms: quotingDefaults.paymentTerms,
          default_quote_validity_days: quotingDefaults.quoteValidityDays,
        })
        .eq("id", companyId);

      if (updateError) {
        setErrors({ form: "Failed to save: " + updateError.message });
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrors({ form: "An unexpected error occurred" });
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-8">
      <StepIndicator currentStep={step} />

      <Card className="w-full max-w-lg">
        {errors.form && (
          <p className="px-6 pt-4 text-sm text-destructive text-center">
            {errors.form}
          </p>
        )}

        {step === 1 && (
          <CompanyDetailsStep
            data={companyDetails}
            onChange={setCompanyDetails}
            errors={errors}
          />
        )}
        {step === 2 && (
          <QuotingDefaultsStep
            data={quotingDefaults}
            onChange={setQuotingDefaults}
            errors={errors}
          />
        )}
        {step === 3 && (
          <PriceListStep
            priceListFile={priceListFile}
            onFileChange={setPriceListFile}
          />
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between px-6 pb-6 pt-2">
          {step > 1 ? (
            <Button variant="outline" onClick={handleBack} disabled={loading}>
              Back
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            {step === 3 && (
              <Button
                variant="outline"
                onClick={() => handleComplete(true)}
                disabled={loading}
              >
                Skip for now
              </Button>
            )}

            {step < 3 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button
                onClick={() => handleComplete(false)}
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="opacity-25"
                      />
                      <path
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        fill="currentColor"
                        className="opacity-75"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

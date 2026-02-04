"use client";

import { motion, type Variants } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  Compass,
  Flag,
  GalleryHorizontalEnd,
  Rocket,
  RotateCcw,
  RotateCw,
  Sparkles,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { ProcessStep } from "@/lib/types";
import { stat } from "fs";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "",
    description: "",
    icon: Upload,
    time: "",
    status: ProcessStep.BEFORE_UPLOAD,
  },
  {
    title: "Import images",
    description:
      "Easily upload multiple images from your device to get started.",
    icon: Upload,
    time: "Step 1",
    status: ProcessStep.IMPORTING,
  },
  {
    title: "Classify & Sort",
    description:
      "Automatically categorize and organize your images for easy access.",
    icon: Sparkles,
    time: "Step 2",
    status: ProcessStep.CLASSIFYING,
  },
  {
    title: "Review & Organize",
    description:
      "Review the classified images and make any necessary adjustments.",
    icon: GalleryHorizontalEnd,
    time: "Step 3",
    status: ProcessStep.SORTING,
  },
];

const container: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      staggerChildren: 0.12,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      ease: "easeOut",
      duration: 0.55,
    },
  },
};



export function GlassmorphismLaunchTimelineBlock({onClick, status, triggerReview}: {onClick?: () => void, status: ProcessStep, triggerReview?: () => void}) {

  return (
    <section className="relative overflow-hidden px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_1fr]">
        {status !== ProcessStep.SORTING && (
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative overflow-hidden rounded-3xl border border-border/50 bg-background/45 p-10 backdrop-blur-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent" />
            <div className="relative">
              <div className="space-y-5">
                <h2 className="text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                  Upload, classify, and sort your images in seconds
                </h2>
                <p className="max-w-xl text-base leading-relaxed text-foreground/70 md:text-lg">
                  Streamline your workflow with our intuitive image
                  classification tool. Upload multiple images at once, let our
                  AI classify them, and organize your gallery effortlessly.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Button
                  disabled={status !== ProcessStep.BEFORE_UPLOAD}
                  size="lg"
                  className={cn(
                    "h-12 rounded-full px-8 text-sm uppercase tracking-[0.2em] cursor-pointer",
                    status !== ProcessStep.BEFORE_UPLOAD &&
                      "opacity-50 cursor-not-allowed",
                  )}
                  onClick={onClick}
                >
                  Upload images
                  {status !== ProcessStep.BEFORE_UPLOAD && (
                    // loading spinner
                    <RotateCw className="ml-2 h-4 w-4 animate-spin" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        

        <motion.ul
          variants={container}
          initial="hidden"
          animate="show"
          className="relative flex flex-col gap-4"
        >
          <div className="pointer-events-none absolute left-[22px] top-4 bottom-4 hidden w-px bg-gradient-to-b from-foreground/10 via-foreground/5 to-transparent lg:block" />
          {steps.map((step, index) => {
            const Icon = step.icon;
            if (index !== 0)
              return (
                <motion.li
                  key={step.title}
                  variants={item}
                  className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/45 p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-border/70"
                >
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border/40 bg-background/70 text-foreground/80 shadow-[0_10px_30px_rgba(15,23,42,0.25)]">
                      {status === step.status ? (
                        //  loading spinner
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">
                          {step.title}
                        </h3>
                        <span className="rounded-full border border-border/40 bg-background/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-foreground/60 backdrop-blur">
                          {step.time}
                        </span>
                      </div>
                      <p className="max-w-xl text-sm leading-relaxed text-foreground/70">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.04] via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 -z-10" />
                </motion.li>
              );
          })}
        </motion.ul>
      </div>
    </section>
  );
}

# vite-plugin-ssg-pages

## Introduction

This is a vite-plugin to create a javascript-less static-site from your repository; it is intrusive in how it operates, but is driven by your vite config and is intended to be very customizable.

**Warning: this is in active development and is not yet ready for external consumers**

## Purpose & Ideas

- This is not intended to be an-all-in-one static-site-generator that abstracts away everything from you. Once setup, it *can* mimic that, but you still need knowledge of vite.
- It is intended to be very customizable and not overly opinionated; the idea is that you can configure various settings via "Mods" which configure how it behaves.

## Supported Mods

- `preact`: render pages with preact
- `pages`: create a file with a `.page` suffix and it's turned into an html file on build

## Use cases

### Use markdown

TODO instructions

### Use preact

TODO instructions

### Customize how pages are determined

TODO instructions

### Change the generated slugs/file-names

TODO instructions


## Releasing

Until we have the name of the package figured out - and we want to formally release it - we're using github releases as the source of the package in other projects.

### Generating an archive

 - Increment the package version as necessary
 - Run:
   
   ```shell
   npm pack
   ```
 - Upload the package to https://github.com/zastrowm/vite-plugin-ssg-pages/releases/edit/0.0.1
 - Reference the package via:

   ```shell
   yarn add -D vite-plugin-ssg-pages@https://github.com/zastrowm/vite-plugin-ssg-pages/releases/download/0.0.1/vite-plugin-ssg-pages-0.0.N.tgz
   ```

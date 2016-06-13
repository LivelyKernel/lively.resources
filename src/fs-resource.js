/*global System*/

import { Resource } from "./resource.js";

import { readFile, writeFile, exists, mkdir, rmdir, unlink, readdir, lstat } from "fs";

function wrapInPromise(func) {
  return (...args) => 
    new Promise((resolve, reject) =>
      func.apply(System.global, args.concat((err, result) => err ? reject(err) : resolve(result))))
}

const readFileP = wrapInPromise(readFile),
      writeFileP = wrapInPromise(writeFile),
      existsP = (path) => new Promise((resolve, reject) => exists(path, (exists) => resolve(!!exists))),
      readdirP = wrapInPromise(readdir),
      mkdirP = wrapInPromise(mkdir),
      rmdirP = wrapInPromise(rmdir),
      unlinkP = wrapInPromise(unlink),
      lstatP = wrapInPromise(lstat);

export class NodeJSFileResource extends Resource {

  async stat() {
    return lstatP(this.path());
  }

  async read() {
    return readFileP(this.path()).then(String);
  }

  async write(content) {
    if (this.isDirectory()) throw new Error(`Cannot write into a directory: ${this.path()}`);
    await writeFileP(this.path(), content);
    return this;
  }

  async mkdir(content) {
    if (this.isFile()) throw new Error(`Cannot mkdir on a file: ${this.path()}`);
    await mkdirP(this.path());
    return this;
  }

  async exists() {
    return this.isRoot() ? true : existsP(this.path());
  }

  async dirList() {
    if (!this.isDirectory())
      throw new Error(`dirList called on non-directory: ${this.path()}`)
    var subResources = [];
    for (let name of await readdirP(this.path())) {
      var subResource = this.join(name);
      subResources.push(
        (await subResource.stat()).isDirectory() ?
          subResource.asDirectory() : subResource);
    }
    return subResources;
  }

  async isEmptyDirectory() {
    return (await this.dirList()).length === 0;
  }

  async remove() {
    if (!(await this.exists())) {
      /*...*/
    } else if (this.isDirectory()) {
      for (let subResource of await this.dirList())
        await subResource.remove();
      await rmdirP(this.path());
    } else {
      await unlinkP(this.path());
    }
    return this;
  }

}

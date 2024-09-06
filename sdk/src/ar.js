import Arweave from "arweave"
import { ArweaveSigner, bundleAndSignData, createData } from "arbundles"
import { tag, query, isLocalhost } from "./utils.js"
import { is } from "ramda"

class AR {
  constructor({ host, port = 443, protocol } = {}) {
    this.__type__ = "ar"
    let _arweave = { host, port, protocol }
    if (!_arweave.host)
      _arweave.host = port === 443 ? "arweave.net" : "127.0.0.1"
    if (!_arweave.protocol)
      _arweave.protocol = isLocalhost(_arweave.host) ? "http" : "https"
    if (!_arweave.port) _arweave.port = isLocalhost(_arweave.host) ? 1984 : 443
    this.port = _arweave.port
    this.arweave = Arweave.init(_arweave)
    this.host = _arweave.host
    this.protocol = _arweave.protocol
  }

  isArConnect(jwk) {
    return this.jwk?.walletName === "ArConnect"
  }

  async init(jwk) {
    if (!jwk && typeof window === "object" && window.arweaveWallet) {
      jwk = window.arweaveWallet
    }
    this.jwk = jwk
    const isWallet = this.isArConnect(this.jwk)
    if (isWallet) {
      try {
        await arweaveWallet.connect([
          "ACCESS_ADDRESS",
          "ACCESS_PUBLIC_KEY",
          "SIGN_TRANSACTION",
        ])
        this.addr = await arweaveWallet.getActiveAddress()
        this.pub = await arweaveWallet.getActivePublicKey()
        this.isWallet = true
      } catch (e) {
        this.isWallet = false
        this.addr = null
        this.pub = null
        this.jwk = null
      }
    } else {
      this.addr = await this.toAddr(jwk)
      this.pub = jwk.n
    }
    return this
  }

  async mine() {
    await this.arweave.api.get(`/mine`)
  }

  async checkWallet() {
    let err = null
    let addr = null
    let jwk = null
    let pub = null
    let existWallet = typeof window === "object" && window.arweaveWallet
    let isJwkWallet = this.isArConnect(this.jwk)
    if (this.jwk && !isJwkWallet) {
      jwk = this.jwk
      addr = this.addr
      pub = this.pub
    } else if (existWallet) {
      await arweaveWallet.connect([
        "ACCESS_ADDRESS",
        "ACCESS_PUBLIC_KEY",
        "SIGN_TRANSACTION",
      ])
      const _addr = await arweaveWallet.getActiveAddress()
      if (_addr) {
        if (this.addr && this.addr !== _addr) {
          err = "the wrong wallet"
        } else {
          addr = _addr
          pub = await arweaveWallet.getActivePublicKey()
          jwk = arweaveWallet
        }
      } else {
        err = "no wallet found"
      }
    } else {
      err = "no wallet found"
    }
    return { addr, jwk, pub, err }
  }

  async balance(addr = this.addr) {
    if (!addr) {
      ;({ addr } = await this.checkWallet())
    }
    return this.toAR(await this.arweave.wallets.getBalance(addr))
  }

  async mint(addr, amount = "1.0") {
    await this.arweave.api.get(`/mint/${addr}/${this.toWinston(amount)}`)
    await this.mine()
    return await this.balance(addr)
  }

  toWinston(ar) {
    return this.arweave.ar.arToWinston(ar)
  }

  toAR(w) {
    return this.arweave.ar.winstonToAr(w)
  }

  async toAddr(jwk) {
    if (!jwk) {
      ;({ jwk } = await this.checkWallet())
    }
    if (this.isArConnect(jwk)) {
      return await jwk.getActiveAddress()
    } else {
      return await this.arweave.wallets.jwkToAddress(jwk)
    }
  }

  async gen(amount, overwrite = false) {
    const jwk = await this.arweave.wallets.generate()
    const addr = await this.toAddr(jwk)
    if (!this.jwk || overwrite) {
      this.jwk = jwk
      this.pub = jwk.n
      this.addr = addr
      this.isWallet = false
    }
    let bal = "0"
    if (amount && isLocalhost(this.host)) bal = await this.mint(addr, amount)
    return { jwk, addr, pub: jwk.n, bal }
  }

  async transfer(ar, target, jwk) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let tx = await this.arweave.createTransaction({
        target,
        quantity: this.toWinston(ar),
      })
      return await this.postTx(tx, jwk)
    }
  }

  async bundle(_items, jwk) {
    let err = null
    if (!jwk) {
      ;({ jwk, err } = await this.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      const signer = new ArweaveSigner(jwk)
      const items = _items.map(v => {
        let tags = []
        for (const k in v[1] && {}) {
          if (is(Array)(v[1][k])) {
            for (const v of v[1][k]) tags.push(tag(k, v))
          } else {
            tags.push(tag(k, v[1][k]))
          }
        }
        return createData(v[0], signer, { tags, ...(v[2] ?? {}) })
      })
      const bundle = await bundleAndSignData(items, signer)
      const tx = await bundle.toTransaction({}, this.arweave, jwk)
      await this.postTx(tx, jwk)
      return { err, items, tx, id: tx.id }
    }
  }

  async post({ data, tags = {}, jwk }) {
    let err = null
    if (!jwk) {
      ;({ err, jwk } = await this.checkWallet())
    }
    if (err) {
      return { err }
    } else {
      let tx = await this.arweave.createTransaction({ data: data })
      for (const k in tags) {
        if (is(Array)(tags[k])) {
          for (const v of tags[k]) tx.addTag(k, v)
        } else {
          tx.addTag(k, tags[k])
        }
      }
      return this.postTx(tx, jwk)
    }
  }

  async postTx(tx, jwk) {
    let err = null
    let res = null
    if (!jwk) {
      ;({ err, jwk } = await this.checkWallet())
    }
    if (!err) {
      if (jwk?.walletName === "ArConnect") {
        tx = await jwk.sign(tx)
      } else {
        await this.arweave.transactions.sign(tx, jwk)
      }
      res = await this.arweave.transactions.post(tx)
      if (res.status !== 200) err = res.statusText
      if (isLocalhost(this.host)) await this.mine()
    }
    return { res, err, id: tx.id }
  }

  async tx(txid) {
    const json = await fetch(
      `${this.protocol}://${this.host}:${this.port}/graphql`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query(txid) }),
      },
    ).then(r => r.json())
    return json.data.transactions.edges.map(v => v.node)[0] ?? null
  }

  async data(txid, string = false) {
    return await this.arweave.transactions.getData(txid, {
      decode: true,
      string,
    })
  }
}

export default AR

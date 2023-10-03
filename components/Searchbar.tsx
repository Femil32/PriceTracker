'use client'
import { scrapAndStoreProducts } from '@/lib/actions';
import React, { FormEvent, useState } from 'react'

const isValidAmazonProductLink = (link: string): boolean => {
  try {
    const parsedLink = new URL(link)
    const hostname = parsedLink.hostname;
    if (
      hostname.includes('amazon.com') ||
      hostname.includes('amazon.') ||
      hostname.includes('amazon')
    ) {
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

const Searchbar = () => {
  const [searchLink, setSearchLink] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const isValidLink = isValidAmazonProductLink(searchLink);

    if (!isValidLink) alert('Please enter a valid Amazon product link');

    try {
      setLoading(true)
      // scrape product data
      const product = await scrapAndStoreProducts(searchLink)
    } catch (error) {
      console.log(error)
    }
    finally {
      setLoading(false)
    }
  }

  return (
    <form className='flex flex-wrap mt-12 gap-4' onSubmit={handleSubmit}>
      <input
        type="text"
        value={searchLink}
        onChange={e => setSearchLink(e.target.value)}
        placeholder='Enter product link'
        className='searchbar-input'
      />
      <button
        type='submit'
        className='searchbar-btn'
        disabled={loading || !searchLink}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}

export default Searchbar
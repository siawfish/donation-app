import React from 'react'
import { TextEffect } from './text-effect'

const AnimatedHeader = () => {
    return (
        <h1 className="text-3xl font-bold tracking-tighter text-primary sm:text-5xl xl:text-6xl/none text-center">
            <TextEffect per='word' as='h1' preset='blur'>
                Find what you need, give what you can
            </TextEffect>
        </h1>
    )
}

export default AnimatedHeader
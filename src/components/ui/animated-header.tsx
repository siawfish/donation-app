import React from 'react'
import { TextEffect } from './text-effect'

const AnimatedHeader = () => {
    return (
        <h1 className="text-2xl font-bold tracking-tighter text-primary sm:text-3xl xl:text-5xl/none text-center">
            <TextEffect per='word' as='h3' preset='blur'>
                Give What You Don’t Need,
            </TextEffect>
            <TextEffect per='word' as='h3' preset='blur'>
                Get What You Do
            </TextEffect>
        </h1>
    )
}

export default AnimatedHeader